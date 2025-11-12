"""
Tests for the FastAPI backend
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_root_endpoint():
    """Test the root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "PV Finance API"
    assert data["status"] == "running"
    assert data["version"] == "1.0.0"


def test_health_endpoint():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_defaults_endpoint():
    """Test the defaults endpoint"""
    response = client.get("/defaults")
    assert response.status_code == 200
    data = response.json()

    # Check required fields are present
    assert "capacity" in data
    assert "capacity_factor" in data
    assert "capex_per_mw" in data
    assert "ppa_price" in data
    assert "om_cost_per_mw_year" in data

    # Check default values
    assert data["capacity"] == 50
    assert data["capacity_factor"] == 0.22
    assert data["capex_per_mw"] == 1_000_000


def test_calculate_endpoint_with_valid_data():
    """Test the calculate endpoint with valid input data"""
    input_data = {
        "capacity": 50,
        "capacity_factor": 0.22,
        "capex_per_mw": 1_000_000,
        "ppa_price": 70,
        "om_cost_per_mw_year": 15_000,
        "degradation_rate": 0.004,
        "ppa_escalation": 0.01,
        "om_escalation": 0.01,
        "gearing_ratio": 0.75,
        "interest_rate": 0.045,
        "debt_tenor": 15,
        "target_dscr": 1.30,
        "project_lifetime": 25,
        "tax_rate": 0.25,
        "discount_rate": 0.08
    }

    response = client.post("/calculate", json=input_data)
    assert response.status_code == 200

    data = response.json()

    # Check all required sections are present
    assert "project_summary" in data
    assert "financing_structure" in data
    assert "key_metrics" in data
    assert "first_year_operations" in data
    assert "assessment" in data

    # Check project summary
    assert data["project_summary"]["capacity_mw"] == 50
    assert data["project_summary"]["total_capex"] == 50_000_000

    # Check key metrics
    assert "project_irr" in data["key_metrics"]
    assert "equity_irr" in data["key_metrics"]
    assert "lcoe" in data["key_metrics"]
    assert "min_dscr" in data["key_metrics"]

    # Check financing structure
    assert "final_debt" in data["financing_structure"]
    assert "equity" in data["financing_structure"]

    # Verify debt + equity = total capex
    total_financing = data["financing_structure"]["final_debt"] + data["financing_structure"]["equity"]
    assert abs(total_financing - 50_000_000) < 1  # Allow for rounding


def test_calculate_endpoint_with_invalid_capacity():
    """Test the calculate endpoint with invalid capacity (negative)"""
    input_data = {
        "capacity": -10,  # Invalid: negative
        "capacity_factor": 0.22,
        "capex_per_mw": 1_000_000,
        "ppa_price": 70,
        "om_cost_per_mw_year": 15_000,
    }

    response = client.post("/calculate", json=input_data)
    assert response.status_code == 422  # Validation error


def test_calculate_endpoint_with_invalid_capacity_factor():
    """Test the calculate endpoint with invalid capacity factor (> 1)"""
    input_data = {
        "capacity": 50,
        "capacity_factor": 1.5,  # Invalid: > 1
        "capex_per_mw": 1_000_000,
        "ppa_price": 70,
        "om_cost_per_mw_year": 15_000,
    }

    response = client.post("/calculate", json=input_data)
    assert response.status_code == 422  # Validation error


def test_calculate_endpoint_with_missing_required_field():
    """Test the calculate endpoint with missing required field"""
    input_data = {
        "capacity": 50,
        "capacity_factor": 0.22,
        # Missing capex_per_mw
        "ppa_price": 70,
        "om_cost_per_mw_year": 15_000,
    }

    response = client.post("/calculate", json=input_data)
    assert response.status_code == 422  # Validation error


def test_calculate_endpoint_with_default_parameters():
    """Test that optional parameters use defaults when not provided"""
    input_data = {
        "capacity": 50,
        "capacity_factor": 0.22,
        "capex_per_mw": 1_000_000,
        "ppa_price": 70,
        "om_cost_per_mw_year": 15_000,
        # All other parameters should use defaults
    }

    response = client.post("/calculate", json=input_data)
    assert response.status_code == 200

    data = response.json()
    assert "key_metrics" in data
    assert data["key_metrics"]["project_irr"] > 0


def test_calculate_endpoint_irr_reasonableness():
    """Test that calculated IRR values are reasonable"""
    input_data = {
        "capacity": 50,
        "capacity_factor": 0.22,
        "capex_per_mw": 1_000_000,
        "ppa_price": 70,
        "om_cost_per_mw_year": 15_000,
        "degradation_rate": 0.004,
        "ppa_escalation": 0.01,
        "om_escalation": 0.01,
        "gearing_ratio": 0.75,
        "interest_rate": 0.045,
        "debt_tenor": 15,
        "target_dscr": 1.30,
        "project_lifetime": 25,
        "tax_rate": 0.25,
        "discount_rate": 0.08
    }

    response = client.post("/calculate", json=input_data)
    data = response.json()

    # IRR should be positive and reasonable (typically 5-15% for solar projects)
    project_irr = data["key_metrics"]["project_irr"]
    assert 0.05 <= project_irr <= 0.20

    # Equity IRR should be higher than project IRR (leverage effect)
    equity_irr = data["key_metrics"]["equity_irr"]
    assert equity_irr > project_irr

    # DSCR should be at or above minimum threshold
    min_dscr = data["key_metrics"]["min_dscr"]
    assert min_dscr > 1.0


def test_calculate_with_cost_items():
    """Test calculation with detailed cost line items"""
    input_data = {
        "capacity": 50,
        "capacity_factor": 0.22,
        "ppa_price": 70,
        "cost_items": [
            {
                "name": "Solar panels",
                "amount": 25_000_000,
                "is_capex": True,
                "escalation_rate": 0.0
            },
            {
                "name": "Inverters",
                "amount": 15_000_000,
                "is_capex": True,
                "escalation_rate": 0.0
            },
            {
                "name": "BOS & Installation",
                "amount": 10_000_000,
                "is_capex": True,
                "escalation_rate": 0.0
            },
            {
                "name": "Maintenance",
                "amount": 500_000,
                "is_capex": False,
                "escalation_rate": 0.01
            },
            {
                "name": "Insurance",
                "amount": 250_000,
                "is_capex": False,
                "escalation_rate": 0.01
            }
        ]
    }

    response = client.post("/calculate", json=input_data)
    assert response.status_code == 200

    data = response.json()

    # Check that cost_items_breakdown is in response
    assert "cost_items_breakdown" in data
    assert "items" in data["cost_items_breakdown"]
    assert "total_capex" in data["cost_items_breakdown"]
    assert "total_opex_year_1" in data["cost_items_breakdown"]

    # Verify totals
    assert data["cost_items_breakdown"]["total_capex"] == 50_000_000
    assert data["cost_items_breakdown"]["total_opex_year_1"] == 750_000

    # Check that calculation succeeded
    assert "project_irr" in data["key_metrics"]
    assert data["key_metrics"]["project_irr"] > 0


def test_calculate_with_cost_items_missing_capex():
    """Test that missing CapEx items causes error"""
    input_data = {
        "capacity": 50,
        "capacity_factor": 0.22,
        "ppa_price": 70,
        "cost_items": [
            {
                "name": "Maintenance",
                "amount": 500_000,
                "is_capex": False,
                "escalation_rate": 0.01
            }
        ]
    }

    response = client.post("/calculate", json=input_data)
    assert response.status_code == 400  # Bad request
    assert "Total CapEx must be greater than 0" in response.json()["detail"]


def test_calculate_with_cost_items_missing_opex():
    """Test that missing OpEx items causes error"""
    input_data = {
        "capacity": 50,
        "capacity_factor": 0.22,
        "ppa_price": 70,
        "cost_items": [
            {
                "name": "Solar panels",
                "amount": 50_000_000,
                "is_capex": True,
                "escalation_rate": 0.0
            }
        ]
    }

    response = client.post("/calculate", json=input_data)
    assert response.status_code == 400  # Bad request
    assert "Total OpEx must be greater than 0" in response.json()["detail"]


def test_calculate_without_cost_items_or_simple_inputs():
    """Test that missing both cost_items and simple inputs causes error"""
    input_data = {
        "capacity": 50,
        "capacity_factor": 0.22,
        "ppa_price": 70,
    }

    response = client.post("/calculate", json=input_data)
    assert response.status_code == 400  # Bad request


def test_export_pdf_endpoint():
    """Test PDF export endpoint"""
    # First, get a calculation result
    input_data = {
        "capacity": 50,
        "capacity_factor": 0.22,
        "capex_per_mw": 1_000_000,
        "ppa_price": 70,
        "om_cost_per_mw_year": 15_000,
    }

    calc_response = client.post("/calculate", json=input_data)
    results = calc_response.json()

    # Now export to PDF
    pdf_response = client.post("/export-pdf", json=results)

    assert pdf_response.status_code == 200
    assert pdf_response.headers["content-type"] == "application/pdf"
    assert "attachment" in pdf_response.headers.get("content-disposition", "")
    assert len(pdf_response.content) > 1000  # PDF should have meaningful content


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

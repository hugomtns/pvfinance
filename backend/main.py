"""
FastAPI backend for PV Finance Calculator
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Optional
import uvicorn

from calculator import ProjectInputs, SolarFinanceCalculator

# Create FastAPI app
app = FastAPI(
    title="PV Finance API",
    description="API for calculating photovoltaic project financials",
    version="1.0.0"
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request model
class ProjectInputsRequest(BaseModel):
    """Request model for project calculation"""

    # Required inputs
    capacity: float = Field(..., gt=0, description="Project capacity in MW")
    capacity_factor: float = Field(..., gt=0, le=1, description="Capacity factor (decimal, e.g., 0.22)")
    capex_per_mw: float = Field(..., gt=0, description="CapEx per MW in €")
    ppa_price: float = Field(..., gt=0, description="PPA price in €/MWh")
    om_cost_per_mw_year: float = Field(..., gt=0, description="O&M cost per MW per year in €")

    # Technical parameters with defaults
    degradation_rate: float = Field(0.004, ge=0, le=0.1, description="Annual degradation rate (decimal)")

    # Economic parameters with defaults
    ppa_escalation: float = Field(0.0, ge=-0.1, le=0.1, description="PPA escalation rate (decimal)")
    om_escalation: float = Field(0.01, ge=-0.1, le=0.1, description="O&M escalation rate (decimal)")

    # Financing parameters
    gearing_ratio: float = Field(0.75, ge=0, le=1, description="Gearing ratio (decimal)")
    interest_rate: float = Field(0.045, gt=0, le=0.2, description="Interest rate (decimal)")
    debt_tenor: int = Field(15, gt=0, le=30, description="Debt tenor in years")
    target_dscr: float = Field(1.30, gt=1, description="Target DSCR ratio")

    # Project timeline
    project_lifetime: int = Field(25, gt=0, le=50, description="Project lifetime in years")

    # Tax and discount
    tax_rate: float = Field(0.25, ge=0, le=1, description="Tax rate (decimal)")
    discount_rate: float = Field(0.08, gt=0, le=0.3, description="Discount rate (decimal)")


# Response model
class ProjectResultsResponse(BaseModel):
    """Response model for calculation results"""

    project_summary: Dict
    financing_structure: Dict
    key_metrics: Dict
    first_year_operations: Dict
    assessment: Dict


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "PV Finance API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.post("/calculate", response_model=ProjectResultsResponse)
async def calculate_project(inputs: ProjectInputsRequest):
    """
    Calculate project financials based on input parameters

    Returns comprehensive financial analysis including:
    - Project summary
    - Financing structure
    - Key metrics (IRR, LCOE, DSCR, NPV)
    - First year operations
    - Project assessment
    """
    try:
        # Convert request model to calculator inputs
        project_inputs = ProjectInputs(
            Capacity=inputs.capacity,
            Capacity_Factor=inputs.capacity_factor,
            CapEx_per_MW=inputs.capex_per_mw,
            PPA_Price=inputs.ppa_price,
            OM_Cost_per_MW_year=inputs.om_cost_per_mw_year,
            Degradation_Rate=inputs.degradation_rate,
            PPA_Escalation=inputs.ppa_escalation,
            OM_Escalation=inputs.om_escalation,
            Gearing_Ratio=inputs.gearing_ratio,
            Interest_Rate=inputs.interest_rate,
            Debt_Tenor=inputs.debt_tenor,
            Target_DSCR=inputs.target_dscr,
            Project_Lifetime=inputs.project_lifetime,
            Tax_Rate=inputs.tax_rate,
            Discount_Rate=inputs.discount_rate
        )

        # Create calculator and generate report
        calculator = SolarFinanceCalculator(project_inputs)
        report = calculator.generate_summary_report()

        return report

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid input: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


@app.get("/defaults")
async def get_defaults():
    """
    Get default values for all parameters
    Useful for initializing the frontend form
    """
    defaults = ProjectInputsRequest(
        capacity=50,
        capacity_factor=0.22,
        capex_per_mw=1_000_000,
        ppa_price=70,
        om_cost_per_mw_year=15_000
    )

    return defaults.model_dump()


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

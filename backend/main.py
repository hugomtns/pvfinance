"""
FastAPI backend for PV Finance Calculator
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Dict, Optional, List
import uvicorn
import os

from calculator import ProjectInputs, SolarFinanceCalculator
from pdf_generator import PDFReportGenerator

# Create FastAPI app
app = FastAPI(
    title="PV Finance API",
    description="API for calculating photovoltaic project financials",
    version="1.0.0"
)

# Configure CORS - allow Railway, Vercel, Netlify, and local development
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:5174",  # Vite preview
]

# Add custom origin from environment variable if provided
custom_origin = os.getenv("FRONTEND_URL")
if custom_origin:
    allowed_origins.append(custom_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r"https://.*\.(railway\.app|vercel\.app|netlify\.app)",  # Allow Railway, Vercel, Netlify
)


# Cost Line Item model
class CostLineItem(BaseModel):
    """Model for individual cost line items"""
    name: str = Field(..., min_length=1, max_length=100, description="Line item name")
    amount: float = Field(..., gt=0, description="Total cost amount in €")
    is_capex: bool = Field(..., description="True for CapEx, False for OpEx")
    # CapEx-specific fields
    unit_price: Optional[float] = Field(None, description="Price per item (CapEx only)")
    quantity: Optional[float] = Field(None, description="Number of items (CapEx only)")
    # Deprecated field (kept for backward compatibility with old localStorage data)
    escalation_rate: Optional[float] = Field(None, description="Deprecated - use general O&M escalation instead")


# Request model
class ProjectInputsRequest(BaseModel):
    """Request model for project calculation"""

    # Required inputs
    capacity: float = Field(..., gt=0, description="Project capacity in MW")
    p50_year_0_yield: float = Field(..., gt=0, description="P50 Year 0 energy yield in MWh")
    capex_per_mw: Optional[float] = Field(None, gt=0, description="CapEx per MW in € (optional if using cost_items)")
    ppa_price: float = Field(..., gt=0, description="PPA price in €/MWh")
    om_cost_per_mw_year: Optional[float] = Field(None, gt=0, description="O&M cost per MW per year in € (optional if using cost_items)")

    # Optional cost line items (alternative to simple capex/opex)
    cost_items: Optional[List[CostLineItem]] = Field(None, description="Detailed cost line items")

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
    yearly_data: Optional[Dict] = None
    monthly_data: Optional[List[Dict]] = None
    cost_items_breakdown: Optional[Dict] = None
    audit_log: Optional[Dict] = None


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
    - Key metrics (IRR, LCOE, DSCR, NPV, Payback Periods)
    - First year operations
    - Project assessment
    """
    try:
        # Determine CapEx and OpEx values
        if inputs.cost_items:
            # Calculate from line items
            total_capex = sum(item.amount for item in inputs.cost_items if item.is_capex)
            total_opex_year_1 = sum(item.amount for item in inputs.cost_items if not item.is_capex)

            # Validate that we have some costs
            if total_capex == 0:
                raise ValueError("Total CapEx must be greater than 0")
            if total_opex_year_1 == 0:
                raise ValueError("Total OpEx must be greater than 0")

            # Convert to per-MW values for calculator
            capex_per_mw = total_capex / inputs.capacity
            om_cost_per_mw_year = total_opex_year_1 / inputs.capacity

            # Use general O&M escalation for all OpEx items
            om_escalation = inputs.om_escalation
        else:
            # Use simple inputs
            if inputs.capex_per_mw is None or inputs.om_cost_per_mw_year is None:
                raise ValueError("Must provide either cost_items or both capex_per_mw and om_cost_per_mw_year")

            capex_per_mw = inputs.capex_per_mw
            om_cost_per_mw_year = inputs.om_cost_per_mw_year
            om_escalation = inputs.om_escalation

        # Convert request model to calculator inputs
        project_inputs = ProjectInputs(
            Capacity=inputs.capacity,
            P50_Year_0_Yield=inputs.p50_year_0_yield,
            CapEx_per_MW=capex_per_mw,
            PPA_Price=inputs.ppa_price,
            OM_Cost_per_MW_year=om_cost_per_mw_year,
            Degradation_Rate=inputs.degradation_rate,
            PPA_Escalation=inputs.ppa_escalation,
            OM_Escalation=om_escalation,
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

        # Add yearly data
        try:
            yearly_data = calculator.generate_yearly_data()
            report["yearly_data"] = yearly_data
        except Exception as e:
            print(f"ERROR generating yearly_data: {e}")
            import traceback
            traceback.print_exc()

        # Add monthly data
        try:
            monthly_data = calculator.generate_monthly_data()
            report["monthly_data"] = monthly_data
        except Exception as e:
            print(f"ERROR generating monthly_data: {e}")
            import traceback
            traceback.print_exc()

        # Add audit log
        try:
            audit_log = calculator.generate_calculation_audit_log()
            report["audit_log"] = audit_log
        except Exception as e:
            print(f"ERROR generating audit_log: {e}")
            import traceback
            traceback.print_exc()

        # Add cost items breakdown to report if provided
        if inputs.cost_items:
            report["cost_items_breakdown"] = {
                "items": [item.model_dump() for item in inputs.cost_items],
                "total_capex": total_capex,
                "total_opex_year_1": total_opex_year_1
            }

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
    # Calculate P50 Year 0 Yield: 300 MW × 0.22 CF × 8760 hours = 577,920 MWh
    defaults = ProjectInputsRequest(
        capacity=300,
        p50_year_0_yield=577_920,
        capex_per_mw=850_000,
        ppa_price=65,
        om_cost_per_mw_year=12_000
    )

    return defaults.model_dump()


@app.post("/export-pdf")
async def export_pdf(report_data: Dict):
    """
    Export project results as PDF

    Accepts the full calculation results and generates a downloadable PDF report
    """
    try:
        # Generate PDF
        pdf_generator = PDFReportGenerator()
        pdf_buffer = pdf_generator.generate_report(report_data)

        # Create filename with timestamp
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"PV_Finance_Report_{timestamp}.pdf"

        # Return as streaming response
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

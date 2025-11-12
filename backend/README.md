# PV Finance Backend

FastAPI backend for calculating photovoltaic project financials.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload
```

The API will be available at http://localhost:8000

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### `GET /`
Health check

### `GET /health`
Health status

### `GET /defaults`
Get default parameter values for the calculator

### `POST /calculate`
Calculate project financials

Example request body:
```json
{
  "capacity": 50,
  "capacity_factor": 0.22,
  "capex_per_mw": 1000000,
  "ppa_price": 70,
  "om_cost_per_mw_year": 15000,
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
```

## Testing

Run tests with pytest:
```bash
pytest
```

Run with coverage:
```bash
pytest --cov=. --cov-report=html
```

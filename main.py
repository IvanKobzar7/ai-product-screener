from fastapi import FastAPI
from pydantic import BaseModel, Field

from fees import MARKETPLACE_FEES, Marketplace, calculate_marketplace_fee

app = FastAPI(title="AI Product Screener")


class ProductInput(BaseModel):
    product_name: str
    marketplace: Marketplace
    buy_cost: float = Field(gt=0, description="Cost per unit in USD")
    sell_price: float = Field(gt=0, description="Selling price in USD")
    fulfillment_fee: float = Field(
        default=0, ge=0,
        description="FBA/WFS fee or your shipping cost per unit",
    )
    fee_percent_override: float | None = Field(
        default=None, ge=0, le=100,
        description="Set this if your category has a different commission rate",
    )
    monthly_sales: int = Field(default=0, ge=0)


class ProductAnalysis(BaseModel):
    product_name: str
    marketplace: Marketplace
    marketplace_fee: float
    fulfillment_fee: float
    total_fees: float
    profit_per_unit: float
    margin_percent: float
    roi_percent: float
    monthly_profit: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/marketplaces")
def list_marketplaces():
    """List supported marketplaces and their default fee schedules."""
    return [
        {
            "id": marketplace.value,
            "percent": schedule.percent,
            "fixed_per_order": schedule.fixed_per_order,
            "minimum": schedule.minimum,
            "note": schedule.note,
        }
        for marketplace, schedule in MARKETPLACE_FEES.items()
    ]


@app.post("/analyze", response_model=ProductAnalysis)
def analyze(product: ProductInput):
    marketplace_fee = calculate_marketplace_fee(
        product.marketplace,
        product.sell_price,
        product.fee_percent_override,
    )
    total_fees = marketplace_fee + product.fulfillment_fee
    profit = product.sell_price - product.buy_cost - total_fees

    return ProductAnalysis(
        product_name=product.product_name,
        marketplace=product.marketplace,
        marketplace_fee=round(marketplace_fee, 2),
        fulfillment_fee=round(product.fulfillment_fee, 2),
        total_fees=round(total_fees, 2),
        profit_per_unit=round(profit, 2),
        margin_percent=round(profit / product.sell_price * 100, 2),
        roi_percent=round(profit / product.buy_cost * 100, 2),
        monthly_profit=round(profit * product.monthly_sales, 2),
    )
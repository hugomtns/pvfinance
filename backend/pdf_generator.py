"""
PDF Report Generator for PV Finance Calculator
"""

from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
from datetime import datetime
from typing import Dict, Any, Optional, List
import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend
import matplotlib.pyplot as plt
import numpy as np


def format_currency(value: float) -> str:
    """Format value as currency"""
    return f"€{value:,.0f}"


def format_percent(value: float) -> str:
    """Format value as percentage"""
    return f"{value * 100:.2f}%"


def format_number(value: float, decimals: int = 2) -> str:
    """Format number with specified decimals"""
    return f"{value:,.{decimals}f}"


class PDFReportGenerator:
    """Generate PDF reports for project analysis"""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()

    def _create_custom_styles(self):
        """Create custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1d4ed8'),
            spaceAfter=30,
            alignment=TA_CENTER
        ))

        # Subtitle style
        self.styles.add(ParagraphStyle(
            name='Subtitle',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.grey,
            spaceAfter=20,
            alignment=TA_CENTER
        ))

        # Section header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#2563eb'),
            spaceAfter=12,
            spaceBefore=20
        ))

    def _generate_cumulative_fcf_chart(
        self,
        data: List[Dict],
        mode: str,
        equity_payback_years: Optional[float] = None
    ) -> BytesIO:
        """
        Generate cumulative FCF chart as an image

        Args:
            data: List of data points (yearly or monthly)
            mode: 'yearly' or 'monthly'
            equity_payback_years: Break-even point in years

        Returns:
            BytesIO buffer containing the chart image
        """
        # Create figure
        fig, ax = plt.subplots(figsize=(10, 5))

        if mode == 'monthly':
            # Monthly data
            x_values = [(d['year'] - 1) * 12 + d['month'] for d in data]
            y_values = [d['cumulative_fcf_to_equity'] for d in data]
            x_labels = [f"Y{d['year']}" if d['month'] == 1 else '' for d in data]
            x_label_text = 'Time (Years)'

            # Calculate break-even month
            breakeven_x = round(equity_payback_years * 12) if equity_payback_years else None
        else:
            # Yearly data
            x_values = data['years']
            y_values = data['cumulative_fcf_to_equity']
            x_labels = [str(y) for y in x_values]
            x_label_text = 'Year'

            # Find break-even year
            breakeven_x = None
            if equity_payback_years is not None:
                # Find the closest year
                for i, year in enumerate(x_values):
                    if abs(year - equity_payback_years) < 0.6:
                        breakeven_x = year
                        break

        # Split data into negative and positive segments
        x_negative, y_negative = [], []
        x_positive, y_positive = [], []

        for i, (x, y) in enumerate(zip(x_values, y_values)):
            # Check if this is a transition point
            prev_y = y_values[i-1] if i > 0 else None
            next_y = y_values[i+1] if i < len(y_values) - 1 else None

            is_last_negative = y < 0 and next_y is not None and next_y >= 0
            is_first_positive = y >= 0 and prev_y is not None and prev_y < 0

            # Add to negative dataset
            if y < 0 or is_first_positive:
                x_negative.append(x)
                y_negative.append(y)

            # Add to positive dataset
            if y >= 0 or is_last_negative:
                x_positive.append(x)
                y_positive.append(y)

        # Plot negative area (red)
        if x_negative:
            ax.fill_between(x_negative, y_negative, 0, alpha=0.3, color='#ef4444', label='Negative FCF')
            ax.plot(x_negative, y_negative, color='#ef4444', linewidth=2)

        # Plot positive area (green)
        if x_positive:
            ax.fill_between(x_positive, y_positive, 0, alpha=0.3, color='#10b981', label='Positive FCF')
            ax.plot(x_positive, y_positive, color='#10b981', linewidth=2)

        # Mark break-even point (blue)
        if breakeven_x is not None:
            try:
                idx = x_values.index(breakeven_x)
                ax.plot(breakeven_x, y_values[idx], 'o', color='#3b82f6', markersize=10,
                       markeredgecolor='white', markeredgewidth=2, label='Break-even', zorder=5)
            except ValueError:
                pass

        # Add zero reference line
        ax.axhline(y=0, color='#9ca3af', linestyle='--', linewidth=1, alpha=0.7)

        # Styling
        ax.set_xlabel(x_label_text, fontsize=11, fontweight='bold')
        ax.set_ylabel('Cumulative Cash Flow (€)', fontsize=11, fontweight='bold')
        ax.set_title('Cumulative Free Cash Flow to Equity', fontsize=13, fontweight='bold', pad=15)

        # Format y-axis as currency
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'€{x/1e6:.1f}M' if abs(x) >= 1e6 else f'€{x/1e3:.0f}K'))

        # X-axis formatting
        if mode == 'monthly':
            # Show only year labels (every 12 months)
            tick_positions = [i for i, label in enumerate(x_labels) if label]
            tick_labels = [x_labels[i] for i in tick_positions]
            ax.set_xticks([x_values[i] for i in tick_positions])
            ax.set_xticklabels(tick_labels)
        else:
            # For yearly, show every 5 years
            ax.set_xticks([x for i, x in enumerate(x_values) if i % 5 == 0 or i == len(x_values) - 1])

        # Grid
        ax.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
        ax.set_axisbelow(True)

        # Legend
        ax.legend(loc='best', framealpha=0.9)

        # Tight layout
        plt.tight_layout()

        # Save to buffer
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
        buffer.seek(0)
        plt.close(fig)

        return buffer

    def generate_report(self, report_data: Dict[str, Any]) -> BytesIO:
        """Generate PDF report from project data"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                                rightMargin=72, leftMargin=72,
                                topMargin=72, bottomMargin=18)

        # Get export options (default to including everything)
        export_options = report_data.get('export_options', {
            'includeYearlyChart': True,
            'includeYearlyTable': True,
            'includeMonthlyChart': False,
            'includeMonthlyTable': False,
        })

        print(f"DEBUG: Export options received: {export_options}")
        print(f"DEBUG: Include Yearly Table: {export_options.get('includeYearlyTable', True)}")
        print(f"DEBUG: Include Monthly Table: {export_options.get('includeMonthlyTable', False)}")

        # Container for the 'Flowable' objects
        elements = []

        # Title
        elements.append(Paragraph("PV Finance Project Analysis", self.styles['CustomTitle']))

        # Date
        date_str = datetime.now().strftime("%B %d, %Y at %H:%M")
        elements.append(Paragraph(f"Generated on {date_str}", self.styles['Subtitle']))
        elements.append(Spacer(1, 0.3 * inch))

        # Project Summary Section
        elements.append(Paragraph("Project Summary", self.styles['SectionHeader']))
        project_summary = report_data.get('project_summary', {})
        summary_data = [
            ['Parameter', 'Value'],
            ['Capacity', f"{project_summary.get('capacity_mw', 0)} MW"],
            ['Capacity Factor', format_percent(project_summary.get('capacity_factor', 0))],
            ['Project Lifetime', f"{project_summary.get('project_lifetime', 0)} years"],
            ['Total CapEx', format_currency(project_summary.get('total_capex', 0))],
            ['CapEx per MW', format_currency(project_summary.get('capex_per_mw', 0))],
        ]
        elements.append(self._create_table(summary_data))
        elements.append(Spacer(1, 0.2 * inch))

        # Key Metrics Section (Highlighted)
        elements.append(Paragraph("Key Financial Metrics", self.styles['SectionHeader']))
        key_metrics = report_data.get('key_metrics', {})
        metrics_data = [
            ['Metric', 'Value'],
            ['Project IRR', format_percent(key_metrics.get('project_irr', 0))],
            ['Equity IRR', format_percent(key_metrics.get('equity_irr', 0))],
            ['LCOE', f"€{key_metrics.get('lcoe', 0):.2f}/MWh"],
            ['Project NPV', format_currency(key_metrics.get('project_npv', 0))],
            ['Min DSCR', f"{key_metrics.get('min_dscr', 0):.2f}x"],
            ['Avg DSCR', f"{key_metrics.get('avg_dscr', 0):.2f}x"],
            ['PPA Price', f"€{key_metrics.get('ppa_price', 0):.2f}/MWh"],
        ]

        # Add payback periods if available
        equity_payback = key_metrics.get('equity_payback_years')
        if equity_payback is not None:
            metrics_data.append(['Equity Payback', f"{equity_payback:.1f} years"])

        project_payback = key_metrics.get('project_payback_years')
        if project_payback is not None:
            metrics_data.append(['Project Payback', f"{project_payback:.1f} years"])

        elements.append(self._create_table(metrics_data, highlight_header=True))
        elements.append(Spacer(1, 0.2 * inch))

        # Financing Structure
        elements.append(Paragraph("Financing Structure", self.styles['SectionHeader']))
        financing = report_data.get('financing_structure', {})
        financing_data = [
            ['Parameter', 'Value'],
            ['Final Debt', format_currency(financing.get('final_debt', 0))],
            ['Equity', format_currency(financing.get('equity', 0))],
            ['Actual Gearing', format_percent(financing.get('actual_gearing', 0))],
            ['Binding Constraint', financing.get('binding_constraint', 'N/A')],
            ['Max Debt by DSCR', format_currency(financing.get('max_debt_by_dscr', 0))],
            ['Max Debt by Gearing', format_currency(financing.get('max_debt_by_gearing', 0))],
            ['Interest Rate', format_percent(financing.get('interest_rate', 0))],
            ['Debt Tenor', f"{financing.get('debt_tenor', 0)} years"],
            ['Annual Debt Service', format_currency(financing.get('annual_debt_service', 0))],
        ]
        elements.append(self._create_table(financing_data))
        elements.append(Spacer(1, 0.2 * inch))

        # First Year Operations
        elements.append(Paragraph("First Year Operations", self.styles['SectionHeader']))
        first_year = report_data.get('first_year_operations', {})
        operations_data = [
            ['Parameter', 'Value'],
            ['Energy Production', f"{first_year.get('energy_production_mwh', 0):,.0f} MWh"],
            ['Revenue', format_currency(first_year.get('revenue', 0))],
            ['O&M Costs', format_currency(first_year.get('om_costs', 0))],
            ['EBITDA', format_currency(first_year.get('ebitda', 0))],
            ['CFADS', format_currency(first_year.get('cfads', 0))],
        ]
        elements.append(self._create_table(operations_data))
        elements.append(Spacer(1, 0.2 * inch))

        # Cost Items Breakdown (if available)
        cost_breakdown = report_data.get('cost_items_breakdown')
        if cost_breakdown:
            elements.append(PageBreak())
            elements.append(Paragraph("Cost Breakdown", self.styles['SectionHeader']))

            capex_items = [item for item in cost_breakdown.get('items', []) if item.get('is_capex')]
            opex_items = [item for item in cost_breakdown.get('items', []) if not item.get('is_capex')]

            if capex_items:
                elements.append(Paragraph("CapEx Line Items", self.styles['Heading3']))

                # Check if items have unit_price and quantity
                has_unit_details = any(item.get('unit_price') is not None and item.get('quantity') is not None for item in capex_items)

                if has_unit_details:
                    # Show detailed breakdown with unit price and quantity
                    capex_data = [['Item Name', 'Price/Item (€)', 'Quantity', 'Total (€)']]
                    for item in capex_items:
                        capex_data.append([
                            item.get('name', 'N/A'),
                            format_currency(item.get('unit_price', 0)),
                            str(item.get('quantity', 0)),
                            format_currency(item.get('amount', 0))
                        ])
                    capex_data.append(['Total CapEx', '', '', format_currency(cost_breakdown.get('total_capex', 0))])
                    table = Table(capex_data, colWidths=[2.5 * inch, 1.5 * inch, 1 * inch, 1.5 * inch])
                else:
                    # Show simple breakdown
                    capex_data = [['Item Name', 'Amount (€)']]
                    for item in capex_items:
                        capex_data.append([item.get('name', 'N/A'), format_currency(item.get('amount', 0))])
                    capex_data.append(['Total CapEx', format_currency(cost_breakdown.get('total_capex', 0))])
                    table = self._create_table(capex_data, highlight_last_row=True)

                # Style for detailed table
                if has_unit_details:
                    style = [
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e5e7eb')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#111827')),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 10),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
                        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                        ('FONTSIZE', (0, 1), (-1, -1), 9),
                        ('TOPPADDING', (0, 1), (-1, -1), 8),
                        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
                        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f3f4f6')),
                        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                    ]
                    table.setStyle(TableStyle(style))

                elements.append(table)
                elements.append(Spacer(1, 0.2 * inch))

            if opex_items:
                elements.append(Paragraph("OpEx Line Items", self.styles['Heading3']))
                opex_data = [['Item Name', 'Amount (€)']]
                for item in opex_items:
                    opex_data.append([
                        item.get('name', 'N/A'),
                        format_currency(item.get('amount', 0))
                    ])
                opex_data.append(['Total OpEx (Year 1)', format_currency(cost_breakdown.get('total_opex_year_1', 0))])

                # Create table with same total width as CapEx table (6.5 inches)
                opex_table = Table(opex_data, colWidths=[4 * inch, 2.5 * inch])
                style = [
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e5e7eb')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#111827')),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 10),
                    ('TOPPADDING', (0, 1), (-1, -1), 8),
                    ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
                    ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f3f4f6')),
                    ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ]
                opex_table.setStyle(TableStyle(style))
                elements.append(opex_table)
                elements.append(Spacer(1, 0.2 * inch))

        # Get data for charts
        yearly_data = report_data.get('yearly_data')
        monthly_data = report_data.get('monthly_data')
        key_metrics = report_data.get('key_metrics', {})
        equity_payback_years = key_metrics.get('equity_payback_years')

        # Add Yearly Chart (if requested)
        if yearly_data and export_options.get('includeYearlyChart', False):
            elements.append(PageBreak())
            elements.append(Paragraph("Cash Flow Analysis - Yearly", self.styles['SectionHeader']))

            try:
                chart_buffer = self._generate_cumulative_fcf_chart(
                    data=yearly_data,
                    mode='yearly',
                    equity_payback_years=equity_payback_years
                )
                chart_img = Image(chart_buffer, width=6.5*inch, height=3.25*inch)
                elements.append(chart_img)
                elements.append(Spacer(1, 0.2 * inch))

                # Add caption
                if equity_payback_years is not None:
                    caption_text = f"Yearly cumulative cash flow to equity investors over project lifetime. Break-even (equity recovered) at year {equity_payback_years:.1f}."
                else:
                    caption_text = "Yearly cumulative cash flow to equity investors over project lifetime."

                caption_style = ParagraphStyle(
                    name='ChartCaption',
                    parent=self.styles['Normal'],
                    fontSize=9,
                    textColor=colors.grey,
                    alignment=TA_CENTER
                )
                elements.append(Paragraph(caption_text, caption_style))
                elements.append(Spacer(1, 0.3 * inch))
            except Exception as e:
                print(f"ERROR generating yearly chart: {e}")
                import traceback
                traceback.print_exc()

        # Add Monthly Chart (if requested)
        if monthly_data and export_options.get('includeMonthlyChart', False):
            if not export_options.get('includeYearlyChart', False):
                elements.append(PageBreak())

            elements.append(Paragraph("Cash Flow Analysis - Monthly", self.styles['SectionHeader']))

            try:
                chart_buffer = self._generate_cumulative_fcf_chart(
                    data=monthly_data,
                    mode='monthly',
                    equity_payback_years=equity_payback_years
                )
                chart_img = Image(chart_buffer, width=6.5*inch, height=3.25*inch)
                elements.append(chart_img)
                elements.append(Spacer(1, 0.2 * inch))

                # Add caption
                if equity_payback_years is not None:
                    breakeven_month = round(equity_payback_years * 12)
                    caption_text = f"Monthly cumulative cash flow to equity investors over project lifetime. Break-even (equity recovered) at month {breakeven_month} (year {equity_payback_years:.1f})."
                else:
                    caption_text = "Monthly cumulative cash flow to equity investors over project lifetime."

                caption_style = ParagraphStyle(
                    name='ChartCaption',
                    parent=self.styles['Normal'],
                    fontSize=9,
                    textColor=colors.grey,
                    alignment=TA_CENTER
                )
                elements.append(Paragraph(caption_text, caption_style))
                elements.append(Spacer(1, 0.3 * inch))
            except Exception as e:
                print(f"ERROR generating monthly chart: {e}")
                import traceback
                traceback.print_exc()

        # Yearly Financial Projections (if available and requested)
        include_yearly_table = export_options.get('includeYearlyTable', True)
        print(f"DEBUG PDF: yearly_data exists: {bool(yearly_data)}")
        print(f"DEBUG PDF: include_yearly_table: {include_yearly_table}")
        print(f"DEBUG PDF: Will include yearly table: {bool(yearly_data and include_yearly_table)}")

        if yearly_data and include_yearly_table:
            elements.append(PageBreak())
            elements.append(Paragraph("Yearly Financial Projections", self.styles['SectionHeader']))

            years = yearly_data.get('years', [])
            energy = yearly_data.get('energy_production_mwh', [])
            revenue = yearly_data.get('revenue', [])
            om_costs = yearly_data.get('om_costs', [])
            ebitda = yearly_data.get('ebitda', [])
            cfads = yearly_data.get('cfads', [])
            debt_service = yearly_data.get('debt_service', [])
            dscr = yearly_data.get('dscr', [])
            fcf = yearly_data.get('fcf_to_equity', [])
            cumulative_fcf = yearly_data.get('cumulative_fcf_to_equity', [])

            # Split into pages of 25 years each (fits most projects on one page)
            years_per_page = 25
            for page_start in range(0, len(years), years_per_page):
                page_end = min(page_start + years_per_page, len(years))

                if page_start > 0:
                    elements.append(PageBreak())
                    elements.append(Paragraph(f"Yearly Financial Projections (continued)", self.styles['SectionHeader']))

                # Build table data for this page
                yearly_table_data = [[
                    'Year', 'Energy\n(MWh)', 'Revenue\n(€)', 'O&M\n(€)',
                    'EBITDA\n(€)', 'CFADS\n(€)', 'Debt Svc\n(€)', 'DSCR',
                    'FCF to Eq\n(€)', 'Cumul FCF\n(€)'
                ]]

                for i in range(page_start, page_end):
                    dscr_val = f"{dscr[i]:.2f}x" if dscr[i] is not None else '—'
                    yearly_table_data.append([
                        str(years[i]),
                        f"{energy[i]:,.0f}",
                        format_currency(revenue[i]),
                        format_currency(om_costs[i]),
                        format_currency(ebitda[i]),
                        format_currency(cfads[i]),
                        format_currency(debt_service[i]),
                        dscr_val,
                        format_currency(fcf[i]),
                        format_currency(cumulative_fcf[i])
                    ])

                # Create table with smaller font and tighter spacing
                yearly_table = Table(yearly_table_data, colWidths=[
                    0.4*inch, 0.7*inch, 0.8*inch, 0.7*inch, 0.8*inch,
                    0.8*inch, 0.7*inch, 0.5*inch, 0.8*inch, 0.8*inch
                ])

                table_style = [
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
                    ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 8),
                    ('FONTSIZE', (0, 1), (-1, -1), 7),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                    ('TOPPADDING', (0, 0), (-1, 0), 8),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
                    ('TOPPADDING', (0, 1), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')])
                ]
                yearly_table.setStyle(TableStyle(table_style))

                elements.append(yearly_table)
                elements.append(Spacer(1, 0.2 * inch))

        # Monthly Financial Projections (if available and requested)
        monthly_data = report_data.get('monthly_data')
        if monthly_data and export_options.get('includeMonthlyTable', False):
            elements.append(PageBreak())
            elements.append(Paragraph("Monthly Financial Projections", self.styles['SectionHeader']))

            # Group by year
            years_dict = {}
            for point in monthly_data:
                year = point.get('year')
                if year not in years_dict:
                    years_dict[year] = []
                years_dict[year].append(point)

            # Process each year (max 2 years per page to keep readable)
            years_per_page = 2
            sorted_years = sorted(years_dict.keys())

            for page_idx, page_start in enumerate(range(0, len(sorted_years), years_per_page)):
                page_end = min(page_start + years_per_page, len(sorted_years))

                if page_idx > 0:
                    elements.append(PageBreak())
                    elements.append(Paragraph(f"Monthly Financial Projections (continued)", self.styles['SectionHeader']))

                for year in sorted_years[page_start:page_end]:
                    elements.append(Paragraph(f"Year {year}", self.styles['Heading3']))

                    monthly_table_data = [[
                        'Month', 'Energy\n(MWh)', 'Revenue\n(€)', 'O&M\n(€)',
                        'EBITDA\n(€)', 'CFADS\n(€)', 'FCF to Eq\n(€)', 'Cumul FCF\n(€)'
                    ]]

                    for month_point in years_dict[year]:
                        monthly_table_data.append([
                            month_point.get('month_name', ''),
                            f"{month_point.get('energy_production_mwh', 0):,.0f}",
                            format_currency(month_point.get('revenue', 0)),
                            format_currency(month_point.get('om_costs', 0)),
                            format_currency(month_point.get('ebitda', 0)),
                            format_currency(month_point.get('cfads', 0)),
                            format_currency(month_point.get('fcf_to_equity', 0)),
                            format_currency(month_point.get('cumulative_fcf_to_equity', 0))
                        ])

                    # Create table with smaller column widths for monthly data
                    col_widths = [0.6*inch, 0.7*inch, 0.9*inch, 0.7*inch, 0.9*inch, 0.9*inch, 0.9*inch, 1*inch]
                    monthly_table = Table(monthly_table_data, colWidths=col_widths)

                    table_style = [
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e5e7eb')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#111827')),
                        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 7),
                        ('FONTSIZE', (0, 1), (-1, -1), 6),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                        ('TOPPADDING', (0, 0), (-1, 0), 6),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
                        ('TOPPADDING', (0, 1), (-1, -1), 3),
                        ('BOTTOMPADDING', (0, 1), (-1, -1), 3),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')])
                    ]
                    monthly_table.setStyle(TableStyle(table_style))

                    elements.append(monthly_table)
                    elements.append(Spacer(1, 0.15 * inch))

        # Assessment
        elements.append(PageBreak())
        elements.append(Paragraph("Project Assessment", self.styles['SectionHeader']))
        assessment = report_data.get('assessment', {})

        assessment_text = []
        for key, value in assessment.items():
            if key != 'overall':
                assessment_text.append(f"<b>{key.upper()}:</b> {value}")

        for line in assessment_text:
            elements.append(Paragraph(line, self.styles['Normal']))
            elements.append(Spacer(1, 0.1 * inch))

        if assessment.get('overall'):
            elements.append(Spacer(1, 0.2 * inch))
            elements.append(Paragraph(f"<b>OVERALL:</b> {assessment['overall']}", self.styles['Normal']))

        # Footer
        elements.append(Spacer(1, 0.5 * inch))
        footer_style = ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.grey,
            alignment=TA_CENTER
        )
        elements.append(Paragraph(
            "Generated by PV Finance Calculator | https://github.com/hugomtns/pvfinance",
            footer_style
        ))

        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer

    def _create_table(self, data, highlight_header=False, highlight_last_row=False):
        """Create a formatted table"""
        table = Table(data, colWidths=[3 * inch, 2.5 * inch])

        # Base style
        style = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e5e7eb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#111827')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]

        if highlight_header:
            style.append(('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')))
            style.append(('TEXTCOLOR', (0, 0), (-1, 0), colors.white))

        if highlight_last_row:
            style.append(('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f3f4f6')))
            style.append(('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'))

        table.setStyle(TableStyle(style))
        return table

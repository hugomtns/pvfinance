"""
PDF Report Generator for PV Finance Calculator
"""

from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
from datetime import datetime
from typing import Dict, Any


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

    def generate_report(self, report_data: Dict[str, Any]) -> BytesIO:
        """Generate PDF report from project data"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                                rightMargin=72, leftMargin=72,
                                topMargin=72, bottomMargin=18)

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
                elements.append(self._create_table(opex_data, highlight_last_row=True))
                elements.append(Spacer(1, 0.2 * inch))

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

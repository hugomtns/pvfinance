/**
 * PDF Report Generator
 *
 * Browser-based PDF generation using jsPDF
 * Replicates ReportLab layout from original Python implementation
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import type { ProjectResults } from '../../types';
import { formatCurrency, formatPercent, formatNumber, formatWithSuffix } from './formatter';

export interface PDFExportOptions {
  includeYearlyChart?: boolean;
  includeYearlyTable?: boolean;
  includeMonthlyChart?: boolean;
  includeMonthlyTable?: boolean;
}

// Colors matching original Python implementation
const COLORS = {
  PRIMARY_BLUE: [29, 78, 216] as [number, number, number],
  SECONDARY_BLUE: [37, 99, 235] as [number, number, number],
  GRAY_LIGHT: [229, 231, 235] as [number, number, number],
  GRAY_DARK: [17, 24, 39] as [number, number, number],
  GRAY_BORDER: [209, 213, 219] as [number, number, number],
  WHITE: [255, 255, 255] as [number, number, number],
  STRIPED_ROW: [249, 250, 251] as [number, number, number]
};

export class PDFReportGenerator {
  private doc!: jsPDF;
  private currentY: number = 20;

  /**
   * Capture chart as image using html2canvas
   */
  private async captureChartAsImage(elementId: string): Promise<string> {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element ${elementId} not found`);
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      logging: false
    });

    return canvas.toDataURL('image/png');
  }

  /**
   * Add chart section to PDF
   * Returns true if chart was added, false if element not found
   */
  private async addChartSection(title: string, elementId: string): Promise<boolean> {
    const element = document.getElementById(elementId);
    if (!element) {
      return false;
    }

    this.addSectionHeader(title);

    const imgData = await this.captureChartAsImage(elementId);

    // Add image to PDF (A4 width = 210mm, margins = 14mm each side)
    // Image width = 182mm, height proportional
    this.doc.addImage(imgData, 'PNG', 14, this.currentY, 182, 100);
    this.currentY += 110;
    return true;
  }

  /**
   * Generate complete PDF report
   */
  async generateReport(
    results: ProjectResults,
    options: PDFExportOptions = {}
  ): Promise<Blob> {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.currentY = 20;

    // Add all sections
    this.addTitle();
    this.addProjectSummary(results.project_summary);
    this.addKeyMetrics(results.key_metrics);
    this.addFinancingStructure(results.financing_structure);
    this.addFirstYearOperations(results.first_year_operations);

    // Conditional sections
    if (results.cost_items_breakdown) {
      this.doc.addPage();
      this.currentY = 20;
      this.addCostBreakdown(results.cost_items_breakdown);
    }

    // Add charts if requested and elements exist
    if (options.includeYearlyChart && document.getElementById('yearly-fcf-chart')) {
      this.doc.addPage();
      this.currentY = 20;
      await this.addChartSection('Cumulative Cash Flow to Equity (Yearly)', 'yearly-fcf-chart');
    }

    if (options.includeMonthlyChart && document.getElementById('monthly-fcf-chart')) {
      this.doc.addPage();
      this.currentY = 20;
      await this.addChartSection('Cumulative Cash Flow to Equity (Monthly)', 'monthly-fcf-chart');
    }

    // Add tables if requested (default behavior for yearly)
    if (results.yearly_data && (options.includeYearlyTable !== false)) {
      this.doc.addPage();
      this.currentY = 20;
      this.addYearlyProjections(results.yearly_data);
    }

    // Note: Monthly table would require additional implementation
    // For now, we skip monthly table export

    this.doc.addPage();
    this.currentY = 20;
    this.addAssessment(results.assessment);

    return this.doc.output('blob');
  }

  /**
   * Section 1: Title and Date
   */
  private addTitle(): void {
    this.doc.setFontSize(24);
    this.doc.setTextColor(...COLORS.PRIMARY_BLUE);
    this.doc.text('PV Finance Project Analysis', 105, this.currentY, { align: 'center' });

    this.currentY += 10;

    this.doc.setFontSize(11);
    this.doc.setTextColor(128, 128, 128);
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    this.doc.text(`Generated on ${dateStr}`, 105, this.currentY, { align: 'center' });

    this.currentY += 15;
  }

  /**
   * Section 2: Project Summary
   */
  private addProjectSummary(summary: any): void {
    this.addSectionHeader('Project Summary');

    const data = [
      ['Capacity', `${formatNumber(summary.capacity_mw, 1)} MW`],
      ['Capacity Factor', formatPercent(summary.capacity_factor)],
      ['P50 Year 0 Yield', `${formatNumber(summary.p50_year_0_yield_mwh, 0)} MWh`],
      ['Project Lifetime', `${summary.project_lifetime} years`],
      ['Total CapEx', formatCurrency(summary.total_capex)],
      ['CapEx per MW', formatCurrency(summary.capex_per_mw)]
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Parameter', 'Value']],
      body: data,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      headStyles: {
        fillColor: COLORS.GRAY_LIGHT,
        textColor: COLORS.GRAY_DARK,
        fontStyle: 'bold'
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Section 3: Key Financial Metrics (highlighted)
   */
  private addKeyMetrics(metrics: any): void {
    this.addSectionHeader('Key Financial Metrics');

    const data = [
      ['Project IRR', formatPercent(metrics.project_irr)],
      ['Equity IRR', formatPercent(metrics.equity_irr)],
      ['LCOE', `${formatNumber(metrics.lcoe, 2)} €/MWh`],
      ['Minimum DSCR', formatWithSuffix(metrics.min_dscr, 2, 'x')],
      ['Average DSCR', formatWithSuffix(metrics.avg_dscr, 2, 'x')],
      ['Project NPV', formatCurrency(metrics.project_npv)],
      ['PPA Price', `${formatNumber(metrics.ppa_price, 2)} €/MWh`]
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: data,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      headStyles: {
        fillColor: COLORS.SECONDARY_BLUE,
        textColor: COLORS.WHITE,
        fontStyle: 'bold'
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Section 4: Financing Structure
   */
  private addFinancingStructure(financing: any): void {
    this.addSectionHeader('Financing Structure');

    const data = [
      ['Max Debt by DSCR', formatCurrency(financing.max_debt_by_dscr)],
      ['Max Debt by Gearing', formatCurrency(financing.max_debt_by_gearing)],
      ['Final Debt', formatCurrency(financing.final_debt)],
      ['Equity', formatCurrency(financing.equity)],
      ['Actual Gearing', formatPercent(financing.actual_gearing)],
      ['Binding Constraint', financing.binding_constraint],
      ['Interest Rate', formatPercent(financing.interest_rate)],
      ['Debt Tenor', `${financing.debt_tenor} years`],
      ['Annual Debt Service', formatCurrency(financing.annual_debt_service)]
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Parameter', 'Value']],
      body: data,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      headStyles: {
        fillColor: COLORS.GRAY_LIGHT,
        textColor: COLORS.GRAY_DARK,
        fontStyle: 'bold'
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Section 5: First Year Operations
   */
  private addFirstYearOperations(firstYear: any): void {
    this.addSectionHeader('First Year Operations');

    const data = [
      ['Energy Production', `${formatNumber(firstYear.energy_production_mwh, 0)} MWh`],
      ['Revenue', formatCurrency(firstYear.revenue)],
      ['O&M Costs', formatCurrency(firstYear.om_costs)],
      ['EBITDA', formatCurrency(firstYear.ebitda)],
      ['CFADS', formatCurrency(firstYear.cfads)]
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: data,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      headStyles: {
        fillColor: COLORS.GRAY_LIGHT,
        textColor: COLORS.GRAY_DARK,
        fontStyle: 'bold'
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Section 6: Cost Breakdown (conditional)
   */
  private addCostBreakdown(costBreakdown: any): void {
    this.addSectionHeader('Cost Breakdown');

    // Calculate global margin from cost breakdown if available
    const globalMargin = costBreakdown.global_margin || 0;

    // CapEx items
    if (costBreakdown.items.filter((item: any) => item.is_capex).length > 0) {
      this.doc.setFontSize(12);
      this.doc.setTextColor(...COLORS.GRAY_DARK);
      this.doc.text('CapEx Items', 14, this.currentY);
      this.currentY += 8;

      let totalBeforeMargin = 0;
      let totalWithMargin = 0;

      const capexItems = costBreakdown.items
        .filter((item: any) => item.is_capex)
        .map((item: any) => {
          const subtotal = item.amount; // unit_price × quantity
          const marginPercent = item.margin_percent ?? globalMargin;
          const total = subtotal * (1 + marginPercent / 100);

          totalBeforeMargin += subtotal;
          totalWithMargin += total;

          if (item.unit_price && item.quantity) {
            return [
              item.name,
              formatCurrency(item.unit_price),
              formatNumber(item.quantity, 0),
              item.unit || '—',
              formatCurrency(subtotal),
              `${formatNumber(marginPercent, 1)}%`,
              formatCurrency(total)
            ];
          } else {
            return [
              item.name,
              '—',
              '—',
              item.unit || '—',
              formatCurrency(subtotal),
              `${formatNumber(marginPercent, 1)}%`,
              formatCurrency(total)
            ];
          }
        });

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Item', 'Price/Item', 'Qty', 'Unit', 'Subtotal', 'Margin%', 'Total']],
        body: capexItems,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: COLORS.GRAY_LIGHT,
          textColor: COLORS.GRAY_DARK,
          fontStyle: 'bold',
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 22, halign: 'right' },
          2: { cellWidth: 18, halign: 'right' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 24, halign: 'right' },
          5: { cellWidth: 18, halign: 'right' },
          6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
        }
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 5;

      // Total CapEx (before and after margin)
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(`Total CapEx (before margin): ${formatCurrency(totalBeforeMargin)}`, 14, this.currentY);
      this.currentY += 5;

      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`Total CapEx (with margin): ${formatCurrency(totalWithMargin)}`, 14, this.currentY);
      this.doc.setFont('helvetica', 'normal');
      this.currentY += 5;

      const effectiveMargin = totalBeforeMargin > 0
        ? ((totalWithMargin - totalBeforeMargin) / totalBeforeMargin) * 100
        : 0;
      this.doc.setFontSize(9);
      this.doc.setTextColor(128, 128, 128);
      this.doc.text(`Effective Margin: ${formatNumber(effectiveMargin, 2)}%`, 14, this.currentY);
      this.doc.setTextColor(...COLORS.GRAY_DARK);
      this.currentY += 10;
    }

    // OpEx items
    if (costBreakdown.items.filter((item: any) => !item.is_capex).length > 0) {
      this.doc.setFontSize(12);
      this.doc.setTextColor(...COLORS.GRAY_DARK);
      this.doc.text('OpEx Items (Year 1)', 14, this.currentY);
      this.currentY += 8;

      const opexItems = costBreakdown.items
        .filter((item: any) => !item.is_capex)
        .map((item: any) => [
          item.name,
          item.unit || '—',
          formatCurrency(item.amount)
        ]);

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Item', 'Unit', 'Annual Cost']],
        body: opexItems,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: COLORS.GRAY_LIGHT,
          textColor: COLORS.GRAY_DARK,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 46, halign: 'right' }
        }
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 5;

      // Total OpEx
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`Total OpEx (Year 1): ${formatCurrency(costBreakdown.total_opex_year_1)}`, 14, this.currentY);
      this.doc.setFont('helvetica', 'normal');
    }
  }

  /**
   * Section 7: Yearly Projections (10-column table)
   */
  private addYearlyProjections(yearlyData: any): void {
    this.addSectionHeader('Yearly Financial Projections');

    const headers = [
      'Year',
      'Energy\n(MWh)',
      'Revenue\n(€)',
      'O&M\n(€)',
      'EBITDA\n(€)',
      'CFADS\n(€)',
      'Debt Svc\n(€)',
      'DSCR',
      'FCF to Eq\n(€)',
      'Cumul FCF\n(€)'
    ];

    const body = yearlyData.years.map((year: number, i: number) => [
      year.toString(),
      formatNumber(yearlyData.energy_production_mwh[i], 0),
      formatNumber(yearlyData.revenue[i], 0),
      formatNumber(yearlyData.om_costs[i], 0),
      formatNumber(yearlyData.ebitda[i], 0),
      formatNumber(yearlyData.cfads[i], 0),
      formatNumber(yearlyData.debt_service[i], 0),
      yearlyData.dscr[i] !== null ? `${formatNumber(yearlyData.dscr[i], 2)}x` : '—',
      formatNumber(yearlyData.fcf_to_equity[i], 0),
      formatNumber(yearlyData.cumulative_fcf_to_equity[i], 0)
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [headers],
      body: body,
      theme: 'striped',
      styles: {
        fontSize: 7,
        cellPadding: 2
      },
      headStyles: {
        fillColor: COLORS.SECONDARY_BLUE,
        textColor: COLORS.WHITE,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right' }
      },
      alternateRowStyles: {
        fillColor: COLORS.STRIPED_ROW
      }
    });
  }

  /**
   * Section 8: Project Assessment
   */
  private addAssessment(assessment: any): void {
    this.addSectionHeader('Project Assessment');

    this.doc.setFontSize(11);
    this.doc.setTextColor(...COLORS.GRAY_DARK);

    const assessmentData = [
      ['Project IRR', assessment.project_irr],
      ['Equity IRR', assessment.equity_irr],
      ['DSCR', assessment.dscr]
    ];

    let y = this.currentY;
    assessmentData.forEach(([label, value]) => {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`${label}:`, 14, y);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(value, 14, y + 6);
      y += 15;
    });

    y += 5;
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Overall Assessment:', 14, y);
    this.doc.setFont('helvetica', 'normal');

    // Wrap long text
    const splitText = this.doc.splitTextToSize(assessment.overall, 180);
    this.doc.text(splitText, 14, y + 6);

    // Add footer
    y += 25;
    this.doc.setFontSize(9);
    this.doc.setTextColor(128, 128, 128);
    this.doc.text('Generated with PV Finance Calculator', 105, y, { align: 'center' });
  }

  /**
   * Helper: Add section header
   */
  private addSectionHeader(title: string): void {
    this.doc.setFontSize(14);
    this.doc.setTextColor(...COLORS.PRIMARY_BLUE);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, 14, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.currentY += 8;
  }
}

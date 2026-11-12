import os
import io
import csv
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models import AnalysisRecord


def generate_pdf_report(record: AnalysisRecord) -> io.BytesIO:
    """
    Generates a PDF analysis report using ReportLab.
    Includes visual estimation details, metrics, recommendations, and the analyzed image.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Custom styles adhering to Soil & Signal palette
    soil_950 = colors.HexColor("#0A0F0C")
    soil_800 = colors.HexColor("#17211B")
    sprout = colors.HexColor("#7DB828")
    bone = colors.HexColor("#2B332E")
    lichen = colors.HexColor("#5B6A61")
    ember = colors.HexColor("#D94B30")
    rind = colors.HexColor("#D98516")

    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=soil_950,
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'ReportSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=lichen,
        spaceAfter=15
    )
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=soil_800,
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'ReportBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=bone
    )
    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=ember if record.fill_status in ("High", "Critical") else sprout
    )

    story = []

    # Header
    story.append(Paragraph("SMART DUSTBIN ESTIMATOR", title_style))
    story.append(Paragraph("WASTE INTELLIGENCE PLATFORM — COMPUTER VISION ANALYSIS REPORT", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=soil_800, spaceAfter=15))

    # Summary table
    status_label = f"<b>{record.fill_status.upper()}</b> ({record.fill_percentage:.1f}%)"
    summary_data = [
        [Paragraph("<b>Analysis ID:</b>", body_style), Paragraph(f"#{record.id}", body_style),
         Paragraph("<b>Date & Time:</b>", body_style), Paragraph(record.created_at.strftime('%Y-%m-%d %H:%M UTC'), body_style)],
        [Paragraph("<b>Image File:</b>", body_style), Paragraph(record.image_name, body_style),
         Paragraph("<b>Confidence Score:</b>", body_style), Paragraph(f"{record.confidence_score:.1f}%", body_style)],
        [Paragraph("<b>Status Classification:</b>", body_style), Paragraph(status_label, badge_style),
         Paragraph("<b>Waste Height:</b>", body_style), Paragraph(f"{record.detected_waste_height or 0:.0f} px / {record.usable_bin_height or 0:.0f} px", body_style)],
    ]
    summary_table = Table(summary_data, colWidths=[110, 150, 110, 150])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F6F8F5")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#D8DFD5")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EAEFE8")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 15))

    # Recommendation Box
    rec_text = record.recommendation or "Normal routine collection schedule applies."
    rec_data = [
        [Paragraph("<b>OPERATIONAL RECOMMENDATION:</b>", body_style)],
        [Paragraph(rec_text, body_style)]
    ]
    rec_table = Table(rec_data, colWidths=[520])
    rec_color = colors.HexColor("#FDF0ED") if record.fill_status == "Critical" else colors.HexColor("#F0F7EB")
    rec_border = ember if record.fill_status == "Critical" else sprout
    rec_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), rec_color),
        ('BOX', (0, 0), (-1, -1), 1, rec_border),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(rec_table)
    story.append(Spacer(1, 15))

    # Images Section (Side-by-side or stacked)
    story.append(Paragraph("VISUAL ANALYSIS EVIDENCE", heading_style))

    img_to_embed = record.result_image_path or record.image_path
    if img_to_embed and os.path.exists(img_to_embed):
        try:
            # Fit image within printable area
            rl_img = RLImage(img_to_embed, width=420, height=260)
            story.append(rl_img)
            story.append(Spacer(1, 10))
        except Exception:
            story.append(Paragraph("[Image preview could not be rendered in PDF]", body_style))

    # Technical Disclaimer
    disclaimer_text = (
        "<i>Disclaimer: This document contains an estimated visual fill level produced via classical computer "
        "vision segmentation and ROI boundary analysis. True volumetric waste capacity may vary based on container geometry, "
        "waste compactness, lighting, and camera angle.</i>"
    )
    story.append(Spacer(1, 15))
    story.append(Paragraph(disclaimer_text, subtitle_style))

    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_history_csv(records: list[AnalysisRecord]) -> str:
    """Generates a CSV string containing historical analysis records."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Analysis ID", "Image Name", "Fill Percentage", "Status",
        "Confidence Score", "Detected Waste Height (px)", "Usable Bin Height (px)",
        "Recommendation", "Timestamp"
    ])
    for r in records:
        writer.writerow([
            r.id,
            r.image_name,
            f"{r.fill_percentage:.1f}%",
            r.fill_status,
            f"{r.confidence_score:.1f}%",
            f"{r.detected_waste_height or 0:.0f}",
            f"{r.usable_bin_height or 0:.0f}",
            r.recommendation or "",
            r.created_at.strftime('%Y-%m-%d %H:%M:%S')
        ])
    return output.getvalue()


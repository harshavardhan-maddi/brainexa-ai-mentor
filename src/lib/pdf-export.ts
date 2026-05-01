import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/**
 * Generates a professional PDF report from a hidden DOM element.
 * @param elementId The ID of the element to capture (must be in DOM)
 * @param filename The name of the resulting PDF file
 */
export const downloadProgressPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID ${elementId} not found.`);
    return;
  }

  try {
    // Optimization for high quality rendering
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution
      useCORS: true, // Allow cross-origin images (like the logo)
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    
    // Calculate PDF dimensions (A4 aspect ratio)
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};

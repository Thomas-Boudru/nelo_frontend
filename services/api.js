const API_BASE_URL = "https://numi-backend-cuzb.onrender.com";

export async function analyzeDocument(imageUri) {
  const formData = new FormData();

  formData.append("document", {
    uri: imageUri,
    name: "document.jpg",
    type: "image/jpeg",
  });

  const response = await fetch(`${API_BASE_URL}/api/documents/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Erreur lors de l'analyse du document");
  }

  return response.json();
}

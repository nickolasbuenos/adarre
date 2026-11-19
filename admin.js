import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// CONFIGURAÇÃO DO CLOUDINARY
const CLOUD_NAME = "mhibjths";
const UPLOAD_PRESET = "adarre_upload";

// UID autorizado
const ADMIN_UID = "q0A9lIzW3CMIc1t4E6hrEPlqNM72";

const loginPanel = document.getElementById("login-panel");
const adminPanel = document.getElementById("admin-panel");

const loginFeedback = document.getElementById("login-feedback");
const formFeedback = document.getElementById("form-feedback");

const productForm = document.getElementById("product-form");
const productList = document.getElementById("product-list");
const searchProducts = document.getElementById("search-products");

const imageInput = document.getElementById("product-images");
const imagePreview = document.getElementById("image-preview");

let allProducts = [];

// Fotos já salvas no produto
let existingImages = [];

// Novas fotos selecionadas
let selectedFiles = [];

const fields = {
  id: document.getElementById("product-id"),
  name: document.getElementById("name"),
  description: document.getElementById("description"),
  price: document.getElementById("price"),
  category: document.getElementById("category"),
  available: document.getElementById("available")
};

function showMessage(element, message) {
  element.textContent = message;
}

// NORMALIZAR TEXTO PARA A PESQUISA

function normalizeText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// PRÉ-VISUALIZAÇÃO DAS FOTOS

function renderImagePreview() {
  imagePreview.textContent = "";

  existingImages.forEach((url, index) => {
    createPreviewCard(url, "Foto cadastrada", () => {
      existingImages.splice(index, 1);
      renderImagePreview();
    });
  });

  selectedFiles.forEach((file, index) => {
    const url = URL.createObjectURL(file);

    createPreviewCard(url, file.name, () => {
      selectedFiles.splice(index, 1);
      renderImagePreview();
    });

    // A URL será liberada quando a imagem for carregada
    const lastImage = imagePreview.lastElementChild?.querySelector("img");

    if (lastImage) {
      lastImage.addEventListener("load", () => URL.revokeObjectURL(url), {
        once: true
      });
    }
  });
}

function createPreviewCard(url, label, onRemove) {
  const card = document.createElement("div");
  card.className = "image-preview-card";

  const image = document.createElement("img");
  image.src = url;
  image.alt = label;

  const name = document.createElement("small");
  name.textContent = label;

  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Remover";
  remove.className = "remove-image";
  remove.addEventListener("click", onRemove);

  card.append(image, name, remove);
  imagePreview.appendChild(card);
}

// SELECIONAR FOTOS

imageInput.addEventListener("change", () => {
  const files = Array.from(imageInput.files || []);

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      showMessage(formFeedback, "Selecione apenas arquivos de imagem.");
      continue;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showMessage(formFeedback, "Use fotos JPG, PNG ou WEBP.");
      continue;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage(formFeedback, `A imagem "${file.name}" ultrapassa 5 MB.`);
      continue;
    }

    selectedFiles.push(file);
  }

  imageInput.value = "";
  renderImagePreview();
});

// ENVIAR UMA FOTO PARA O CLOUDINARY

async function uploadImage(file) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("Erro Cloudinary:", result);
    throw new Error(result.error?.message || "Falha no envio da imagem.");
  }

  return result.secure_url;
}

// ENVIAR TODAS AS FOTOS SELECIONADAS

async function uploadSelectedImages() {
  const uploadedUrls = [];

  for (let i = 0; i < selectedFiles.length; i++) {
    showMessage(
      formFeedback,
      `Enviando foto ${i + 1} de ${selectedFiles.length}...`
    );

    const url = await uploadImage(selectedFiles[i]);
    uploadedUrls.push(url);
  }

  return uploadedUrls;
}

// VERIFICAR LOGIN

onAuthStateChanged(auth, user => {
  if (!user) {
    loginPanel.hidden = false;
    adminPanel.hidden = true;
    return;
  }

  if (user.uid !== ADMIN_UID) {
    showMessage(
      loginFeedback,
      "Esta conta não tem autorização para acessar o painel."
    );

    signOut(auth);
    return;
  }

  loginPanel.hidden = true;
  adminPanel.hidden = false;

  loadAdminProducts();
});

// ENTRAR

document.getElementById("login-form").addEventListener("submit", async event => {
  event.preventDefault();

  showMessage(loginFeedback, "Entrando...");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error(error);

    showMessage(
      loginFeedback,
      "Não foi possível entrar. Confira o e-mail e a senha."
    );
  }
});

// SAIR

document.getElementById("logout").addEventListener("click", () => {
  signOut(auth);
});

// LIMPAR FORMULÁRIO

function resetForm() {
  productForm.reset();

  fields.id.value = "";
  fields.available.checked = true;

  document.querySelectorAll('input[name="sizes"]').forEach(input => {
    input.checked = false;
  });

  existingImages = [];
  selectedFiles = [];

  imageInput.value = "";
  renderImagePreview();

  document.getElementById("form-title").textContent = "Adicionar produto";
  document.getElementById("save-button").textContent = "Salvar produto";
  document.getElementById("cancel-edit").hidden = true;

  showMessage(formFeedback, "");
}

document.getElementById("cancel-edit").addEventListener("click", resetForm);

// SALVAR OU EDITAR PRODUTO

productForm.addEventListener("submit", async event => {
  event.preventDefault();

  const saveButton = document.getElementById("save-button");

  const price = Number(fields.price.value);

  if (!Number.isFinite(price) || price <= 0) {
    showMessage(formFeedback, "Informe um preço válido maior que zero.");
    return;
  }

  const selectedSizes = Array.from(
    document.querySelectorAll('input[name="sizes"]:checked')
  ).map(input => input.value);

  if (selectedSizes.length === 0) {
    showMessage(formFeedback, "Selecione pelo menos um tamanho.");
    return;
  }

  saveButton.disabled = true;

  try {
    // Enviar novas fotos
    const uploadedUrls = await uploadSelectedImages();

    // Manter as fotos antigas que não foram removidas
    const productImages = [...existingImages, ...uploadedUrls];

    const product = {
      name: fields.name.value.trim(),
      description: fields.description.value.trim(),
      price,
      category: fields.category.value,
      sizes: selectedSizes,
      available: fields.available.checked,
      images: productImages,
      updatedAt: serverTimestamp()
    };

    showMessage(formFeedback, "Salvando produto...");

    if (fields.id.value) {
      await updateDoc(
        doc(db, "products", fields.id.value),
        product
      );
    } else {
      product.createdAt = serverTimestamp();

      await addDoc(
        collection(db, "products"),
        product
      );
    }

    resetForm();

    await loadAdminProducts();

    showMessage(formFeedback, "Produto salvo com sucesso!");

  } catch (error) {
    console.error(error);

    showMessage(
      formFeedback,
      `Não foi possível salvar: ${error.message}`
    );

  } finally {
    saveButton.disabled = false;
  }
});

// PESQUISAR PRODUTOS

searchProducts.addEventListener("input", () => {
  renderProducts();
});

// CARREGAR PRODUTOS DO FIREBASE

async function loadAdminProducts() {
  productList.textContent = "Carregando produtos...";

  try {
    const productsQuery = query(
      collection(db, "products"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(productsQuery);

    allProducts = snapshot.docs.map(productDoc => ({
      id: productDoc.id,
      data: productDoc.data()
    }));

    renderProducts();

  } catch (error) {
    console.error(error);

    productList.textContent =
      "Não foi possível listar os produtos. Verifique as regras do Firestore.";
  }
}

// EXIBIR E FILTRAR PRODUTOS

function renderProducts() {
  const search = normalizeText(searchProducts.value);

  const filteredProducts = allProducts.filter(item => {
    return normalizeText(item.data.name).includes(search);
  });

  productList.textContent = "";

  if (allProducts.length === 0) {
    productList.textContent = "Ainda não há produtos cadastrados.";
    return;
  }

  if (filteredProducts.length === 0) {
    productList.textContent = "Nenhum produto encontrado.";
    return;
  }

 const categoryNames = {
  novidades: "Novidades da Semana",
  "mais-vendidos": "Mais Vendidos",
  achadinhos: "Achadinhos a partir de R$ 29,90",
  "looks-fim-semana": "Looks para o Final de Semana",
  promocoes: "Promoções Imperdíveis"
};

  filteredProducts.forEach(item => {
    const product = item.data;
    const productId = item.id;

    const row = document.createElement("article");
    row.className = "product-row";

    const info = document.createElement("div");
    info.className = "product-info";

    const name = document.createElement("strong");
    name.textContent = product.name || "Produto sem nome";

    const details = document.createElement("small");
    details.textContent =
      `R$ ${Number(product.price || 0).toFixed(2).replace(".", ",")} · ${categoryNames[product.category] || product.category || "Sem categoria"}`;

    const sizes = document.createElement("small");
    const savedSizes = Array.isArray(product.sizes) ? product.sizes : [];

    sizes.textContent = savedSizes.length
      ? `Tamanhos: ${savedSizes.join(", ")}`
      : "Tamanhos: não informados";

    const photos = document.createElement("small");
    const savedImages = Array.isArray(product.images) ? product.images : [];

    photos.textContent = `Fotos: ${savedImages.length}`;

    const status = document.createElement("span");
    status.className = product.available ? "status" : "status off";
    status.textContent = product.available
      ? "Disponível na loja"
      : "Indisponível";

    info.append(
      name,
      details,
      document.createElement("br"),
      sizes,
      document.createElement("br"),
      photos,
      document.createElement("br"),
      status
    );

    const actions = document.createElement("div");
    actions.className = "product-actions";

    // EDITAR

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "secondary";
    edit.textContent = "Editar";

    edit.addEventListener("click", () => {
      fields.id.value = productId;
      fields.name.value = product.name || "";
      fields.description.value = product.description || "";
      fields.price.value = product.price ?? "";
      const newCategories = [
  "novidades",
  "mais-vendidos",
  "achadinhos",
  "looks-fim-semana",
  "promocoes"
];

fields.category.value = newCategories.includes(product.category)
  ? product.category
  : "";
      fields.available.checked = product.available !== false;

      const savedSizes = Array.isArray(product.sizes) ? product.sizes : [];

      document.querySelectorAll('input[name="sizes"]').forEach(input => {
        input.checked = savedSizes.includes(input.value);
      });

      existingImages = Array.isArray(product.images)
        ? [...product.images]
        : [];

      selectedFiles = [];

      imageInput.value = "";
      renderImagePreview();

      document.getElementById("form-title").textContent = "Editar produto";
      document.getElementById("save-button").textContent = "Salvar alterações";
      document.getElementById("cancel-edit").hidden = false;

      showMessage(formFeedback, "");

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });

    // EXCLUIR

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "secondary";
    remove.textContent = "Excluir";

    remove.addEventListener("click", async () => {
      if (!confirm(`Tem certeza que deseja excluir "${product.name}"?`)) {
        return;
      }

      try {
        await deleteDoc(doc(db, "products", productId));

        if (fields.id.value === productId) {
          resetForm();
        }

        await loadAdminProducts();

      } catch (error) {
        console.error(error);
        alert("Não foi possível excluir. Confira as regras do Firestore.");
      }
    });

    actions.append(edit, remove);
    row.append(info, actions);
    productList.appendChild(row);
  });
}
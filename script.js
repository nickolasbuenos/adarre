
import { db } from "./firebase.js";
import {
  collection, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const grid = document.getElementById("grid");
const title = document.getElementById("ptitle");

const titles = {
  novidades: "Novidades da Semana",
  "mais-vendidos": "Mais Vendidos",
  achadinhos: "Achadinhos a partir de R$ 29,90",
  "looks-fim-semana": "Looks para o Final de Semana",
  promocoes: "Promoções Imperdíveis"
};

let products = [];
const cart = {};
const WA = "5531992297248";
// ELEMENTOS DA JANELA DO PRODUTO
const productModal = document.getElementById("product-modal");
const modalImage = document.getElementById("modal-image");
const modalThumbnails = document.getElementById("modal-thumbnails");
const modalName = document.getElementById("modal-name");
const modalDescription = document.getElementById("modal-description");
const modalPrice = document.getElementById("modal-price");
const modalSizeArea = document.getElementById("modal-size-area");
const modalFeedback = document.getElementById("modal-feedback");
const modalBuy = document.getElementById("modal-buy");

let selectedProduct = null;
let modalImages = [];
let currentModalImage = 0;

function showModalImage(index) {
  if (!modalImages.length) return;

  currentModalImage =
    (index + modalImages.length) % modalImages.length;

  modalImage.src = modalImages[currentModalImage];
  modalImage.alt = selectedProduct.name || "Foto do produto";

  modalThumbnails.querySelectorAll("button").forEach((button, i) => {
    button.classList.toggle("active", i === currentModalImage);
  });
}

function openProductModal(product) {
  selectedProduct = product;

  modalImages = Array.isArray(product.images)
    ? product.images.filter(url =>
        typeof url === "string" && url.trim() !== ""
      )
    : [];

  currentModalImage = 0;

  modalName.textContent = product.name || "";
  modalDescription.textContent = product.description || "";
  modalPrice.textContent = brl(product.price);

  modalThumbnails.textContent = "";

  if (modalImages.length) {
    modalImages.forEach((url, index) => {
      const thumbnail = document.createElement("button");
      thumbnail.type = "button";
      thumbnail.className = "modal-thumbnail";

      const img = document.createElement("img");
      img.src = url;
      img.alt = `Foto ${index + 1} de ${product.name}`;

      thumbnail.appendChild(img);

      thumbnail.addEventListener("click", () => {
        showModalImage(index);
      });

      modalThumbnails.appendChild(thumbnail);
    });

    showModalImage(0);
  } else {
    modalImage.removeAttribute("src");
    modalImage.alt = "Foto não cadastrada";
  }

  const sizes = Array.isArray(product.sizes)
    ? product.sizes
    : [];

  modalSizeArea.textContent = "";
  modalFeedback.textContent = "";

  if (sizes.length) {
    const label = document.createElement("label");
    label.className = "modal-size-label";
    label.textContent = "Selecione o tamanho:";

    const select = document.createElement("select");
    select.className = "modal-size-select";
    select.id = "modal-size-select";

    const first = document.createElement("option");
    first.value = "";
    first.textContent = "Escolha um tamanho";
    select.appendChild(first);

    sizes.forEach(size => {
      const option = document.createElement("option");
      option.value = size;
      option.textContent = size;
      select.appendChild(option);
    });

    modalSizeArea.append(label, select);
  } else {
    const warning = document.createElement("small");
    warning.className = "size-feedback";
    warning.textContent = "Tamanhos ainda não cadastrados.";
    modalSizeArea.appendChild(warning);
  }

  productModal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeProductModal() {
  productModal.classList.remove("open");
  document.body.style.overflow = "";
  selectedProduct = null;
}

function brl(value) {
  return "R$ " + Number(value || 0).toFixed(2).replace(".", ",");
}

function filterProducts(category) {
  document.querySelectorAll(".card").forEach(card => {
    card.style.display =
      card.dataset.cat === category ? "" : "none";
  });

  title.textContent = titles[category] || titles.novidades;
}

document.querySelectorAll("a[data-cat]").forEach(link => {
  link.addEventListener("click", () => {
    filterProducts(link.getAttribute("data-cat"));
  });
});

// Adiciona o produto junto com o tamanho escolhido
function add(product, size) {
  const key = `${product.id}_${size || "sem-tamanho"}`;

if (!cart[key]) {
  cart[key] = {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    image: Array.isArray(product.images) ? product.images[0] || "" : "",
    size: size || "Não informado",
    q: 0
  };
}

  cart[key].q++;

  drawCart();
  openCart();
}


function renderProducts(list) {
  grid.textContent = "";

  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "catalog-status";
    empty.textContent =
      "Nenhum produto disponível no momento. Volte em breve!";
    grid.appendChild(empty);
    return;
  }

  list.forEach(product => {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.cat = product.category;

    // FOTO DO PRODUTO
    const photo = document.createElement("div");
    photo.className = "ph";

    const images = Array.isArray(product.images)
      ? product.images
      : [];

    const imageUrl = images.find(url =>
      typeof url === "string" && url.trim() !== ""
    );

    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = product.name || "Foto do produto";
      img.loading = "lazy";

      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.display = "block";

      img.onerror = () => {
        photo.textContent = "Imagem indisponível";
      };

      photo.style.padding = "0";
      photo.style.overflow = "hidden";
      photo.appendChild(img);
    } else {
      photo.textContent = "Foto do produto";
    }

    photo.setAttribute("role", "button");
    photo.setAttribute("tabindex", "0");
    photo.setAttribute("aria-label", `Ver detalhes de ${product.name}`);

    photo.addEventListener("click", () => {
      openProductModal(product);
    });

    photo.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openProductModal(product);
      }
    });

    // NOME
    const name = document.createElement("h3");
    name.textContent = product.name;

    // DESCRIÇÃO

    // PREÇO
    const price = document.createElement("div");
    price.className = "price";
    price.textContent = brl(product.price);



    // TAMANHOS
    const sizes = Array.isArray(product.sizes)
      ? product.sizes
      : [];

    let sizeSelect = null;
    let feedback = null;

    if (sizes.length > 0) {
      const sizeLabel = document.createElement("label");
      sizeLabel.className = "size-label";
      sizeLabel.textContent = "Selecione o tamanho:";

      sizeSelect = document.createElement("select");
      sizeSelect.className = "size-select";

      const firstOption = document.createElement("option");
      firstOption.value = "";
      firstOption.textContent = "Escolha um tamanho";
      sizeSelect.appendChild(firstOption);

      sizes.forEach(size => {
        const option = document.createElement("option");
        option.value = size;
        option.textContent = size;
        sizeSelect.appendChild(option);
      });

      feedback = document.createElement("small");
      feedback.className = "size-feedback";
      feedback.textContent = "";

      card.append(sizeLabel, sizeSelect, feedback);
    } else {
      const warning = document.createElement("small");
      warning.className = "size-feedback";
      warning.textContent = "Tamanhos ainda não cadastrados.";
      card.appendChild(warning);
    }

    // BOTÃO COMPRAR
    const button = document.createElement("button");
    button.className = "btn";
    button.type = "button";
    button.textContent = "Comprar";

    button.addEventListener("click", () => {
      let selectedSize = "";

      if (sizes.length > 0) {
        selectedSize = sizeSelect.value;

        if (!selectedSize) {
          feedback.textContent = "Escolha um tamanho antes de comprar.";
          sizeSelect.focus();
          return;
        }
      }

      add(product, selectedSize);

      if (feedback) {
        feedback.textContent = "";
      }

      button.textContent = "Adicionada!";

      setTimeout(() => {
        button.textContent = "Comprar";
      }, 1200);
    });


card.append(
  photo,
  name,
  price,
  button
);


    grid.appendChild(card);
  });
}


async function loadProducts() {
  try {
    const productsQuery = query(
      collection(db, "products"),
      where("available", "==", true)
    );

    const snapshot = await getDocs(productsQuery);

    products = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    products.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    renderProducts(products);

    filterProducts("novidades");

  } catch (error) {
    console.error("Erro ao carregar produtos:", error);

    grid.textContent = "";

    const message = document.createElement("p");
    message.className = "catalog-status";
    message.textContent =
      "Não foi possível carregar os produtos. Verifique a conexão com o Firebase.";

    grid.appendChild(message);
  }
}

function openCart() {
  document.getElementById("drawer").classList.add("open");
  document.getElementById("ov").classList.add("open");
  document.getElementById("drawer").setAttribute("aria-hidden", "false");
}

function closeCart() {
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("ov").classList.remove("open");
  document.getElementById("drawer").setAttribute("aria-hidden", "true");
}

function drawCart() {
  const box = document.getElementById("items");
  const keys = Object.keys(cart);

  let count = 0;
  let sum = 0;

  const messageLines = ["Olá! Quero comprar na Adarré:"];

  box.textContent = "";

  if (!keys.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Sua sacola está vazia.";
    box.appendChild(empty);
  }

  keys.forEach(key => {
    const item = cart[key];

    count += item.q;
    sum += item.q * item.price;

    messageLines.push(
      `${item.q}x ${item.name} | Tamanho: ${item.size} | ${brl(item.price)} cada | Total: ${brl(item.q * item.price)}`
    );

    const row = document.createElement("div");
    row.className = "it";

const photo = document.createElement("div");
photo.className = "ph";

if (item.image) {
  const img = document.createElement("img");
  img.src = item.image;
  img.alt = item.name;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.display = "block";

  photo.style.padding = "0";
  photo.style.overflow = "hidden";
  photo.appendChild(img);
}

    const details = document.createElement("div");

    const name = document.createElement("b");
    name.textContent = item.name;

    const size = document.createElement("small");
    size.textContent = "Tamanho: " + item.size;

    const price = document.createElement("small");
    price.textContent = brl(item.price);

    const quantity = document.createElement("div");
    quantity.className = "q";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "-";
    minus.setAttribute("aria-label", "Diminuir quantidade");

    const quantityText = document.createElement("span");
    quantityText.textContent = item.q;

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", "Aumentar quantidade");

    minus.addEventListener("click", () => {
      item.q--;

      if (item.q < 1) {
        delete cart[key];
      }

      drawCart();
    });

    plus.addEventListener("click", () => {
      item.q++;
      drawCart();
    });

    quantity.append(minus, quantityText, plus);
    details.append(name, size);

    price.style.display = "block";
    price.style.marginTop = "5px";

    details.append(price, quantity);

    const remove = document.createElement("button");
    remove.className = "rm";
    remove.type = "button";
    remove.textContent = "Remover";

    remove.addEventListener("click", () => {
      delete cart[key];
      drawCart();
    });

    row.append(photo, details, remove);
    box.appendChild(row);
  });

  messageLines.push(`Total: ${brl(sum)}`);

  document.getElementById("n").textContent = count;
  document.getElementById("total").textContent = brl(sum);

  document.getElementById("fin").href = keys.length
    ? `https://wa.me/${WA}?text=${encodeURIComponent(messageLines.join("\n"))}`
    : "#";
}

document.getElementById("cartbtn").addEventListener("click", openCart);
document.getElementById("close").addEventListener("click", closeCart);
document.getElementById("ov").addEventListener("click", closeCart);

// CONTROLES DA JANELA DO PRODUTO

document.getElementById("modal-close").addEventListener("click", closeProductModal);

document.getElementById("modal-prev").addEventListener("click", () => {
  showModalImage(currentModalImage - 1);
});

document.getElementById("modal-next").addEventListener("click", () => {
  showModalImage(currentModalImage + 1);
});

productModal.addEventListener("click", event => {
  if (event.target === productModal) {
    closeProductModal();
  }
});

modalBuy.addEventListener("click", () => {
  if (!selectedProduct) return;

  const product = selectedProduct;
  const sizeSelect = document.getElementById("modal-size-select");

  let selectedSize = "";

  if (sizeSelect) {
    selectedSize = sizeSelect.value;

    if (!selectedSize) {
      modalFeedback.textContent =
        "Escolha um tamanho antes de continuar.";
      sizeSelect.focus();
      return;
    }
  }

  closeProductModal();
  add(product, selectedSize);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeCart();
    closeProductModal();
  }
});

drawCart();
loadProducts();



// CARROSSEL PRINCIPAL ADARRÉ - COMPUTADOR E CELULAR

const desktopImages = [
  "adarre-nova1.jpg",
  "adarre-nova2.jpg",
  "adarre-nova3.jpg",
  "adarre-nova4.jpg",
  "adarre-nova5.jpg"
];

const mobileImages = [
  "adarre-mobile1.jpg",
  "adarre-mobile2.jpg",
  "adarre-mobile3.jpg",
  "adarre-mobile4.jpg",
  "adarre-mobile5.jpg"
];

const heroImage = document.getElementById("hero-image");
const heroPrev = document.getElementById("hero-prev");
const heroNext = document.getElementById("hero-next");
const heroDots = document.getElementById("hero-dots");

let currentHeroSlide = 0;
let heroImages = [];

function updateHeroImages() {
  const isMobile = window.matchMedia("(max-width: 700px)").matches;

  heroImages = isMobile ? mobileImages : desktopImages;

  currentHeroSlide = 0;
  heroDots.innerHTML = "";

  heroImages.forEach((image, index) => {
    const dot = document.createElement("button");

    dot.setAttribute("aria-label", `Foto ${index + 1}`);

    dot.addEventListener("click", () => {
      showHeroSlide(index);
    });

    heroDots.appendChild(dot);
  });

  showHeroSlide(0);
}

function showHeroSlide(index) {
  currentHeroSlide =
    (index + heroImages.length) % heroImages.length;

  heroImage.style.opacity = "0";

  setTimeout(() => {
    heroImage.src = heroImages[currentHeroSlide];
    heroImage.style.opacity = "1";
  }, 200);

  heroDots.querySelectorAll("button").forEach((dot, i) => {
    dot.classList.toggle("active", i === currentHeroSlide);
  });
}

heroNext.addEventListener("click", () => {
  showHeroSlide(currentHeroSlide + 1);
});

heroPrev.addEventListener("click", () => {
  showHeroSlide(currentHeroSlide - 1);
});

// Carrega as fotos adequadas ao dispositivo
updateHeroImages();

// Detecta quando a tela muda de tamanho
window.matchMedia("(max-width: 700px)").addEventListener("change", updateHeroImages);

// Troca automática a cada 4 segundos
setInterval(() => {
  showHeroSlide(currentHeroSlide + 1);
}, 4000);

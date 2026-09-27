/* =========================================================
   Mini Shopee — Script Katalog
   Murni Vanilla JS. Tanpa framework/library.

   KEY UNTUK AUTH — disesuaikan persis dengan login.js
   milik teman kamu:

     localStorage.setItem("firstName", foundUser.firstName);

   Nilainya string biasa (bukan JSON), jadi di sini
   tidak perlu JSON.parse.

   ---------------------------------------------------------
   Update:
   - Load More / Pagination: sudah pakai array slicing (tetap).
   - Detail Produk Modal: dibangun via Event Delegation,
     satu listener di productGridEl untuk semua kartu.
   - Global Error Handling: status message punya tipe
     (loading/error) + tombol "Coba Lagi", plus jaring
     pengaman window.onerror / unhandledrejection.
   ========================================================= */

(function () {
  "use strict";

  const AUTH_STORAGE_KEY = "firstName";
  const CART_STORAGE_KEY = "shopeeCart";
  const PAGE_SIZE = 12;

  // ---------------------------------------------------------
  // 1. AUTH GUARD — runs immediately, before anything renders
  // ---------------------------------------------------------
  const currentUserName = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!currentUserName) {
    window.location.replace("login.html");
    return;
  }

  // ---------------------------------------------------------
  // 2. DOM references
  // ---------------------------------------------------------
  const userNameEl = document.getElementById("userName");
  const logoutBtn = document.getElementById("logoutBtn");
  const cartCountEl = document.getElementById("cartCount");
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const sortSelect = document.getElementById("sortSelect");
  const resultsCountEl = document.getElementById("resultsCount");
  const statusMessageEl = document.getElementById("statusMessage");
  const productGridEl = document.getElementById("productGrid");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  const cartToggleBtn = document.getElementById("cartToggleBtn");
  const cartOverlay = document.getElementById("cartOverlay");
  const cartDrawer = document.getElementById("cartDrawer");
  const cartCloseBtn = document.getElementById("cartCloseBtn");
  const cartItemsListEl = document.getElementById("cartItemsList");
  const cartEmptyMessageEl = document.getElementById("cartEmptyMessage");
  const cartTotalEl = document.getElementById("cartTotal");
  const cartClearBtn = document.getElementById("cartClearBtn");

  // ---------------------------------------------------------
  // 3. Greet the user + wire up logout
  // ---------------------------------------------------------
  userNameEl.textContent = currentUserName;

  logoutBtn.addEventListener("click", function () {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.href = "login.html";
  });

  // ---------------------------------------------------------
  // 4. App state
  // ---------------------------------------------------------
  let masterProducts = [];   // everything fetched from the API, untouched
  let visibleCount = PAGE_SIZE;

  const state = {
    search: "",
    category: "all",
    sort: "default",
  };

  // ---------------------------------------------------------
  // Cart state — persisted in localStorage (CRUD)
  // Shape: [{ id, title, price, thumbnail, quantity }, ...]
  // ---------------------------------------------------------
  function loadCart() {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }

  let cart = loadCart(); // Read on startup, so the cart survives a page reload

  function formatMoney(value) {
    return "$" + value.toFixed(2);
  }

  // Create / Update — add a product, or bump quantity if already in cart
  function addToCart(product) {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: product.id,
        title: product.title,
        price: product.price,
        thumbnail: product.thumbnail,
        quantity: 1,
      });
    }
    saveCart(cart);
    renderCart();
  }

  // Update — change quantity by +1/-1; removes the item once it hits 0
  function changeQuantity(id, delta) {
    const item = cart.find((entry) => entry.id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      cart = cart.filter((entry) => entry.id !== id);
    }
    saveCart(cart);
    renderCart();
  }

  // Delete — remove a single line item entirely
  function removeFromCart(id) {
    cart = cart.filter((entry) => entry.id !== id);
    saveCart(cart);
    renderCart();
  }

  // Delete — clear the whole cart
  function clearCart() {
    cart = [];
    localStorage.removeItem(CART_STORAGE_KEY);
    renderCart();
  }

  function buildCartRow(item) {
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <img src="${item.thumbnail}" alt="${item.title}">
      <div class="cart-row-info">
        <p class="cart-row-name">${item.title}</p>
        <p class="cart-row-price">${formatMoney(item.price)} &times; ${item.quantity}</p>
      </div>
      <div class="cart-row-actions">
        <div class="qty-control">
          <button class="qty-btn" type="button" data-action="decrease" aria-label="Kurangi jumlah">&minus;</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn" type="button" data-action="increase" aria-label="Tambah jumlah">+</button>
        </div>
        <button class="remove-btn" type="button" data-action="remove">Hapus</button>
      </div>
    `;

    row
      .querySelector('[data-action="decrease"]')
      .addEventListener("click", () => changeQuantity(item.id, -1));
    row
      .querySelector('[data-action="increase"]')
      .addEventListener("click", () => changeQuantity(item.id, 1));
    row
      .querySelector('[data-action="remove"]')
      .addEventListener("click", () => removeFromCart(item.id));

    return row;
  }

  // Read — re-render the badge count + drawer contents from current cart state
  function renderCart() {
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountEl.textContent = String(totalQuantity);

    cartItemsListEl.innerHTML = "";

    if (cart.length === 0) {
      cartEmptyMessageEl.hidden = false;
    } else {
      cartEmptyMessageEl.hidden = true;
      const fragment = document.createDocumentFragment();
      cart.forEach((item) => fragment.appendChild(buildCartRow(item)));
      cartItemsListEl.appendChild(fragment);
    }

    const totalPrice = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    cartTotalEl.textContent = formatMoney(totalPrice);
  }

  function openCart() {
    cartOverlay.hidden = false;
    cartDrawer.hidden = false;
    cartToggleBtn.setAttribute("aria-expanded", "true");
  }

  function closeCart() {
    cartOverlay.hidden = true;
    cartDrawer.hidden = true;
    cartToggleBtn.setAttribute("aria-expanded", "false");
  }

  cartToggleBtn.addEventListener("click", openCart);
  cartCloseBtn.addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);
  cartClearBtn.addEventListener("click", clearCart);

  renderCart(); // Reflect any cart saved from a previous session immediately

  // ---------------------------------------------------------
  // 5. Debounce via closure
  //    Wraps a function so it only actually runs once the
  //    user has stopped triggering it for `delay` ms.
  // ---------------------------------------------------------
  function debounce(fn, delay) {
    let timerId; // captured in the closure, persists between calls
    return function (...args) {
      clearTimeout(timerId);
      timerId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ---------------------------------------------------------
  // 6. Pure(ish) helpers — functional style array manipulation
  // ---------------------------------------------------------
  function applySearch(products, term) {
    const query = term.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
  }

  function applyCategory(products, category) {
    if (category === "all") return products;
    return products.filter((p) => p.category === category);
  }

  function applySort(products, sortKey) {
    const sorted = [...products]; // never mutate the source array
    switch (sortKey) {
      case "price-asc":
        return sorted.sort((a, b) => a.price - b.price);
      case "price-desc":
        return sorted.sort((a, b) => b.price - a.price);
      case "rating-desc":
        return sorted.sort((a, b) => b.rating - a.rating);
      case "rating-asc":
        return sorted.sort((a, b) => a.rating - b.rating);
      default:
        return sorted;
    }
  }

  function getFilteredProducts() {
    let result = masterProducts;
    result = applySearch(result, state.search);
    result = applyCategory(result, state.category);
    result = applySort(result, state.sort);
    return result;
  }

  // ---------------------------------------------------------
  // 7. Rendering
  // ---------------------------------------------------------
  function formatPrice(value) {
    return "$" + value.toFixed(2);
  }

  function originalPriceFrom(price, discountPercentage) {
    if (!discountPercentage) return null;
    const original = price / (1 - discountPercentage / 100);
    return original;
  }

  // Kartu produk tidak lagi punya listener sendiri-sendiri.
  // Klik tombol "Tambah ke Keranjang" maupun klik kartu untuk
  // membuka modal, keduanya ditangani lewat Event Delegation
  // di productGridEl (lihat handleGridClick di bawah).
  function buildCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.id = product.id; // dipakai handleGridClick untuk cari produknya lagi

    const hasDiscount = product.discountPercentage > 0.5;
    const original = originalPriceFrom(product.price, product.discountPercentage);

    card.innerHTML = `
      <div class="card-media">
        ${
          hasDiscount
            ? `<span class="discount-tag">-${Math.round(product.discountPercentage)}%</span>`
            : ""
        }
        <img src="${product.thumbnail}" alt="${product.title}" loading="lazy">
      </div>
      <div class="card-body">
        <span class="category-pill">${product.category}</span>
        <p class="product-name">${product.title}</p>
        <div class="price-row">
          <span class="price-current">${formatPrice(product.price)}</span>
          ${
            original
              ? `<span class="price-original">${formatPrice(original)}</span>`
              : ""
          }
        </div>
        <div class="rating-row">
          <span class="star">&#9733;</span>
          <span>${product.rating.toFixed(1)}</span>
        </div>
        <button class="add-cart-btn" type="button">Tambah ke Keranjang</button>
      </div>
    `;

    return card;
  }

  function renderGrid() {
    const filtered = getFilteredProducts();
    const slice = filtered.slice(0, visibleCount); // <-- teknik array slicing (Load More)

    productGridEl.innerHTML = "";

    if (filtered.length === 0) {
      showStatus("Tidak ada produk yang cocok dengan pencarian/filter ini.", "empty");
      loadMoreBtn.hidden = true;
      resultsCountEl.textContent = "0 produk";
      return;
    }

    hideStatus();

    const fragment = document.createDocumentFragment();
    slice.forEach((product) => fragment.appendChild(buildCard(product)));
    productGridEl.appendChild(fragment);

    resultsCountEl.textContent = `${slice.length} dari ${filtered.length} produk`;
    loadMoreBtn.hidden = slice.length >= filtered.length;
  }

  // type: "loading" | "error" | "empty" (default netral)
  // options.retry: kalau diisi fungsi, tombol "Coba Lagi" akan muncul
  function showStatus(message, type, options) {
    options = options || {};
    statusMessageEl.innerHTML = "";
    statusMessageEl.className = "status-message" + (type ? " " + type : "");

    const text = document.createElement("span");
    text.textContent = message;
    statusMessageEl.appendChild(text);

    if (options.retry) {
      const retryBtn = document.createElement("button");
      retryBtn.type = "button";
      retryBtn.className = "status-retry-btn";
      retryBtn.textContent = "Coba Lagi";
      retryBtn.addEventListener("click", options.retry);
      statusMessageEl.appendChild(retryBtn);
    }

    statusMessageEl.hidden = false;
  }

  function hideStatus() {
    statusMessageEl.hidden = true;
    statusMessageEl.innerHTML = "";
  }

  // ---------------------------------------------------------
  // 7b. Detail Produk Modal
  // ---------------------------------------------------------
  let activeModalOverlay = null;

  function openProductModal(product) {
    closeProductModal(); // jaga-jaga kalau ada modal lama masih nyangkut

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true" aria-label="Detail produk">
        <button class="modal-close" type="button" aria-label="Tutup">&times;</button>
        <div class="modal-content">
          <div class="modal-img-wrap">
            <img src="${product.thumbnail}" alt="${product.title}">
          </div>
          <div class="modal-info">
            <span class="category-pill">${product.category}</span>
            <h2 class="modal-title">${product.title}</h2>
            <div class="modal-meta-row">
              <span>Brand: <strong>${product.brand || "-"}</strong></span>
              <span class="rating-row"><span class="star">&#9733;</span> ${product.rating.toFixed(1)}</span>
            </div>
            <div class="modal-price">${formatPrice(product.price)}</div>
            <span class="modal-stock ${product.stock > 0 ? "in-stock" : "out-of-stock"}">
              ${product.stock > 0 ? product.stock + " stok tersedia" : "Stok habis"}
            </span>
            <p class="modal-desc">${product.description || "Tidak ada deskripsi."}</p>
            <button class="add-cart-btn modal-add-btn" type="button"${product.stock <= 0 ? " disabled" : ""}>
              ${product.stock > 0 ? "Tambah ke Keranjang" : "Stok Habis"}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    activeModalOverlay = overlay;

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay || event.target.closest(".modal-close")) {
        closeProductModal();
        return;
      }
      const addBtn = event.target.closest(".modal-add-btn");
      if (addBtn && !addBtn.disabled) {
        addToCart(product);
        addBtn.textContent = "Ditambahkan";
        setTimeout(closeProductModal, 500);
      }
    });

    document.addEventListener("keydown", handleModalEscape);
  }

  function handleModalEscape(event) {
    if (event.key === "Escape") closeProductModal();
  }

  function closeProductModal() {
    if (activeModalOverlay) {
      activeModalOverlay.remove();
      activeModalOverlay = null;
    }
    document.body.style.overflow = "";
    document.removeEventListener("keydown", handleModalEscape);
  }

  // ---------------------------------------------------------
  // 7c. Event Delegation — satu listener untuk semua kartu produk
  //     (kartu selalu dibangun ulang tiap renderGrid, jadi
  //     listener per-kartu akan sia-sia; delegation di parent
  //     yang statis (#productGrid) jauh lebih efisien).
  // ---------------------------------------------------------
  function handleGridClick(event) {
    const addBtn = event.target.closest(".add-cart-btn");
    if (addBtn) {
      event.stopPropagation();
      const card = addBtn.closest(".product-card");
      const productId = Number(card.dataset.id);
      const product = masterProducts.find((p) => p.id === productId);
      if (!product) return;

      addToCart(product);
      addBtn.textContent = "Ditambahkan";
      addBtn.classList.add("added");
      setTimeout(() => {
        addBtn.textContent = "Tambah ke Keranjang";
        addBtn.classList.remove("added");
      }, 1200);
      return;
    }

    const card = event.target.closest(".product-card");
    if (card) {
      const productId = Number(card.dataset.id);
      const product = masterProducts.find((p) => p.id === productId);
      if (product) openProductModal(product);
    }
  }

  productGridEl.addEventListener("click", handleGridClick);

  // ---------------------------------------------------------
  // 8. Populate the category dropdown from the fetched data
  // ---------------------------------------------------------
  function populateCategoryFilter(products) {
    const categories = Array.from(
      new Set(products.map((p) => p.category))
    ).sort((a, b) => a.localeCompare(b));

    categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });
  }

  // ---------------------------------------------------------
  // 9. Event wiring
  // ---------------------------------------------------------
  const handleSearchInput = debounce(function (event) {
    state.search = event.target.value;
    visibleCount = PAGE_SIZE;
    renderGrid();
  }, 350);

  searchInput.addEventListener("input", handleSearchInput);

  categoryFilter.addEventListener("change", function (event) {
    state.category = event.target.value;
    visibleCount = PAGE_SIZE;
    renderGrid();
  });

  sortSelect.addEventListener("change", function (event) {
    state.sort = event.target.value;
    visibleCount = PAGE_SIZE;
    renderGrid();
  });

  loadMoreBtn.addEventListener("click", function () {
    visibleCount += PAGE_SIZE;
    renderGrid();
  });

  // ---------------------------------------------------------
  // 10. Fetch products dynamically + Global Error Handling
  // ---------------------------------------------------------
  async function loadProducts() {
    showStatus("Memuat produk...", "loading");
    loadMoreBtn.hidden = true;

    try {
      // Step 1: a cheap request just to learn the real total count
      const countResponse = await fetch("https://dummyjson.com/products?limit=1");
      if (!countResponse.ok) {
        throw new Error("Gagal memuat produk (status " + countResponse.status + ")");
      }
      const countData = await countResponse.json();
      const total = countData.total || 0;

      // Step 2: fetch every product in one go using the real total as the limit
      // (dummyjson's `limit=0` does NOT mean "all" — it just falls back to 30)
      const response = await fetch(`https://dummyjson.com/products?limit=${total}`);
      if (!response.ok) {
        throw new Error("Gagal memuat produk (status " + response.status + ")");
      }
      const data = await response.json();
      masterProducts = Array.isArray(data.products) ? data.products : [];

      if (masterProducts.length === 0) {
        showStatus("Tidak ada produk yang tersedia saat ini.", "empty");
        return;
      }

      populateCategoryFilter(masterProducts);
      renderGrid();
    } catch (err) {
      // Global error handling untuk kegagalan fetch: pesan visual + tombol coba lagi
      masterProducts = [];
      productGridEl.innerHTML = "";
      resultsCountEl.textContent = "";
      showStatus(
        "Terjadi kesalahan saat memuat produk. Periksa koneksi Anda lalu coba lagi.",
        "error",
        { retry: loadProducts }
      );
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  // Jaring pengaman tambahan untuk error tak terduga di luar try/catch
  // di atas (mis. error rendering, promise lain yang tidak ditangani).
  window.addEventListener("error", function (event) {
    console.error("Unhandled error:", event.error || event.message);
  });
  window.addEventListener("unhandledrejection", function (event) {
    console.error("Unhandled promise rejection:", event.reason);
  });

  loadProducts();
})();
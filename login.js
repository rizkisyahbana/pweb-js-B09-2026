const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const errorMessage = document.getElementById("errorMessage");
const loadingMessage = document.getElementById("loadingMessage");
const loginButton = document.getElementById("loginButton");

// kl user pernah login (ada di local)
// langsung ke katalog, gk perlu login lagi
const savedName = localStorage.getItem("firstName");
if (savedName) {
  window.location.href = "index.html";
}

// pesan error
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
}

// nyembunyikan pesan error
function hideError() {
  errorMessage.textContent = "";
  errorMessage.style.display = "none";
}

// nyala/mati loading
function setLoading(isLoading) {
  if (isLoading) {
    loadingMessage.style.display = "block";
    loginButton.disabled = true;
    loginButton.textContent = "Memproses...";
  } else {
    loadingMessage.style.display = "none";
    loginButton.disabled = false;
    loginButton.textContent = "Login";
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  hideError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (username === "" || password === "") {
    showError("Username dan password wajib diisi!");
    return;
  }

  if (username === "ITS" && password === "10nop") {
    localStorage.setItem("firstName", "ITS");
    window.location.href = "index.html";
    return;
  }

  setLoading(true);

  try {
    // ambil data dari dummyjson
    const response = await fetch("https://dummyjson.com/users?limit=0");

    if (!response.ok) {
      throw new Error("Gagal mengambil data dari server");
    }

    const data = await response.json();
    const users = data.users;

    const foundUser = users.find(
      (user) => user.username === username && user.password === password
    );

    if (foundUser) {
      localStorage.setItem("firstName", foundUser.firstName);

      window.location.href = "index.html";
    } else {
      showError("Username atau password salah, coba lagi ya!");
    }
  } catch (error) {
    console.error("Terjadi error saat login:", error);
    showError("Terjadi masalah saat menghubungi server. Coba lagi nanti.");
  } finally {
    setLoading(false);
  }
});

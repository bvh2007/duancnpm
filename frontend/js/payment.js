import { API_BASE } from "./config.js";

const BANK_ID = "TCB";
const ACCOUNT_NO = "3379621456";
const ACCOUNT_NAME = "BUI VAN HOI";

const token = localStorage.getItem("token");

const params = new URLSearchParams(window.location.search);
const planId = Number(params.get("planId")) || 2;

const statusEl = document.getElementById("status");
const infoEl = document.getElementById("payment-info");
const qrContainer = document.getElementById("qr-container");

async function createPayment() {
  try {
    if (!token) {
      throw new Error("Bạn chưa đăng nhập");
    }

    const response = await fetch(`${API_BASE}/features/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        planId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Không thể tạo giao dịch");
    }

    showPayment(data);
  } catch (error) {
    console.error(error);

    statusEl.textContent = error.message;
    statusEl.style.color = "red";
  }
}

function showPayment(payment) {
  statusEl.textContent = "Chờ thanh toán";
  statusEl.style.color = "#d97706";

  infoEl.innerHTML = `
    <div>
      <strong>Gói:</strong> ${payment.plan}
    </div>

    <div>
      <strong>Số tiền:</strong>
      ${payment.amount.toLocaleString("vi-VN")} VNĐ
    </div>

    <div>
      <strong>Mã giao dịch:</strong>
      ${payment.transactionCode}
    </div>

    <div>
      <strong>Trạng thái:</strong>
      ${payment.status}
    </div>
  `;

  const addInfo = encodeURIComponent(payment.transactionCode);

  const qrUrl =
    `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png` +
    `?amount=${payment.amount}` +
    `&addInfo=${addInfo}` +
    `&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  qrContainer.innerHTML = `
    <img
      src="${qrUrl}"
      alt="Mã QR thanh toán VietQR"
    >
  `;
}

createPayment();

import { API_BASE } from "./config.js";

const token = localStorage.getItem("token");

const params = new URLSearchParams(window.location.search);
const planId = Number(params.get("planId")) || 2;

const statusEl = document.getElementById("status");
const infoEl = document.getElementById("payment-info");
const qrContainer = document.getElementById("qr-container");

let currentPayment = null;

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

    currentPayment = data;

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
      <strong>Gói:</strong>
      ${payment.plan}
    </div>

    <div>
      <strong>Số tiền:</strong>
      ${Number(payment.amount).toLocaleString("vi-VN")} VNĐ
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

  qrContainer.innerHTML = `
    <img
      src="${payment.checkoutUrl}"
      alt="Thanh toán VietQR"
      style="max-width:360px;width:100%;"
    >

    <p style="margin-top:12px;">
      Quét mã QR bằng ứng dụng ngân hàng để thanh toán.
    </p>

    <button
      id="btn-confirm-payment"
      class="btn btn-primary"
      style="margin-top:16px;"
    >
      Tôi đã thanh toán
    </button>
  `;

  const confirmButton = document.getElementById("btn-confirm-payment");

  confirmButton.addEventListener("click", confirmPayment);
}

async function confirmPayment() {
  if (!currentPayment) {
    alert("Chưa có giao dịch thanh toán.");
    return;
  }

  const confirmed = confirm("Bạn có chắc đã thanh toán giao dịch này không?");

  if (!confirmed) {
    return;
  }

  const button = document.getElementById("btn-confirm-payment");

  try {
    button.disabled = true;
    button.textContent = "Đang xác nhận...";

    const response = await fetch(
      `${API_BASE}/features/payment/${currentPayment.paymentId}/confirm`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Không thể xác nhận thanh toán");
    }

    statusEl.textContent = "✓ Thanh toán thành công";

    statusEl.style.color = "green";

    infoEl.innerHTML += `
      <div style="margin-top:12px;color:green;">
        <strong>
          ✓ Gói ${data.plan || currentPayment.plan}
          đã được kích hoạt.
        </strong>
      </div>
    `;

    button.textContent = "Đã thanh toán";
  } catch (error) {
    console.error(error);

    button.disabled = false;
    button.textContent = "Tôi đã thanh toán";

    alert(error.message);
  }
}

createPayment();

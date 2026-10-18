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

// =====================================================
// 1. TẠO GIAO DỊCH THANH TOÁN
// =====================================================

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

// =====================================================
// 2. HIỂN THỊ THÔNG TIN THANH TOÁN + QR
// =====================================================

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

  // Tạo nội dung chuyển khoản
  const addInfo = encodeURIComponent(payment.transactionCode);

  // Tạo URL QR VietQR
  const qrUrl =
    `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png` +
    `?amount=${payment.amount}` +
    `&addInfo=${addInfo}` +
    `&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  // Hiển thị QR + nút xác nhận
  qrContainer.innerHTML = `
    <img
      src="${qrUrl}"
      alt="Mã QR thanh toán VietQR"
    >

    <button
      id="confirmPaymentBtn"
      class="btn btn-primary"
      style="margin-top: 16px;"
    >
      Tôi đã thanh toán
    </button>
  `;

  // Bắt sự kiện nút xác nhận
  const confirmBtn = document.getElementById("confirmPaymentBtn");

  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      // payment.id phải là ID giao dịch
      confirmPayment(payment.paymentId);
    });
  }
}

// =====================================================
// 3. XÁC NHẬN THANH TOÁN
// =====================================================

async function confirmPayment(paymentId) {
  try {
    if (!paymentId) {
      throw new Error("Không tìm thấy mã giao dịch để xác nhận");
    }

    statusEl.textContent = "Đang xác nhận thanh toán...";

    statusEl.style.color = "#2563eb";

    const response = await fetch(
      `${API_BASE}/features/payment/${paymentId}/confirm`,
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

    // ==============================================
    // THANH TOÁN THÀNH CÔNG
    // ==============================================

    statusEl.textContent = "🎉 Thanh toán thành công!";

    statusEl.style.color = "#16a34a";

    infoEl.innerHTML = `
      <div>
        <strong>Gói:</strong>
        ${data.plan || paymentId}
      </div>

      <div>
        <strong>Trạng thái:</strong>
        Đã thanh toán
      </div>

      <div
        style="
          color: #16a34a;
          margin-top: 10px;
        "
      >
        Gói của bạn đã được kích hoạt.
      </div>
    `;

    // Vô hiệu hóa nút sau khi xác nhận
    const btn = document.getElementById("confirmPaymentBtn");

    if (btn) {
      btn.disabled = true;
      btn.textContent = "✓ Đã xác nhận";
    }
  } catch (error) {
    console.error(error);

    statusEl.textContent = error.message;

    statusEl.style.color = "red";
  }
}

// =====================================================
// 4. BẮT ĐẦU
// =====================================================

createPayment();

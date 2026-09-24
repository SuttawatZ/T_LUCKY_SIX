const demoTickets = ["019284","155090","228811","336729","403009","568956","709118","818284","927700","110011","290519","645192"].map((number, index) => ({ _id: `demo-${index}`, number, price: [100, 120, 100, 140][index % 4], series: `ชุด ${String(index + 1).padStart(2, "0")}` }));
demoTickets.push(...["081624","190745","224680","317459","420168","509327","630491","748205","871036","990261","012345","100001","123789","222908","316416","428997","517247","609112","734567","856140","945023","054321","162834","273945","384056","495167","506278","617389","728490","839501","940612","051723","163845","274956","385067","496178","507289","618390","729401","830512","941623","052734","164856","275967","386078","497189","508290","619401","720512","831623","942734","063845","174956","285067","396178","407289","518390","629401"].map((number, index) => ({ _id: `extra-${index}`, number, price: [80, 100, 120, 140][index % 4], series: `ชุด ${String(index + 13).padStart(2, "0")}` })));
const state = { tickets: demoTickets, cart: JSON.parse(localStorage.getItem("lucky-six-cart") || "[]"), filter: "" };
const el = (id) => document.getElementById(id);
const money = (value) => `฿${value.toLocaleString("th-TH")}`;

function renderTickets() {
  const query = state.filter;
  const shown = state.tickets.filter((ticket) => ticket.number.includes(query));
  el("ticketGrid").innerHTML = shown.map((ticket) => `<article class="ticket"><div class="ticket-top"><span>งวด 16 ก.ย. 2569</span><span>${ticket.series}</span></div><div class="ticket-number">${ticket.number}</div><div class="ticket-bottom"><span class="ticket-price">${money(ticket.price)}</span><button class="add" data-id="${ticket._id}" aria-label="เพิ่ม ${ticket.number}">+</button></div></article>`).join("");
  el("emptyState").hidden = shown.length > 0;
  document.querySelectorAll(".add").forEach((button) => button.addEventListener("click", () => addTicket(button.dataset.id)));
}
function persist() { localStorage.setItem("lucky-six-cart", JSON.stringify(state.cart)); }
function addTicket(id) {
  const ticket = state.tickets.find((item) => item._id === id);
  if (state.cart.some((item) => item._id === id)) return notify("เลขนี้อยู่ในตะกร้าแล้ว");
  state.cart.push(ticket); persist(); renderCart(); notify(`จองเลข ${ticket.number} แล้ว`);
}
function removeTicket(id) { state.cart = state.cart.filter((item) => item._id !== id); persist(); renderCart(); }
function renderCart() {
  el("cartCount").textContent = state.cart.length;
  el("cartItems").innerHTML = state.cart.map((ticket) => `<div class="cart-item"><div><b>${ticket.number}</b><span>งวด 16 ก.ย. 2569 · ${ticket.series}</span></div><div><strong>${money(ticket.price)}</strong><button data-remove="${ticket._id}">ลบ</button></div></div>`).join("");
  el("cartEmpty").hidden = state.cart.length > 0;
  const total = state.cart.reduce((sum, ticket) => sum + ticket.price, 0);
  el("cartTotal").textContent = money(total); el("checkout").disabled = !state.cart.length;
  document.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", () => removeTicket(button.dataset.remove)));
}
function toggleCart(show) { el("cartPanel").classList.toggle("open", show); el("backdrop").classList.toggle("show", show); el("cartPanel").setAttribute("aria-hidden", !show); }
function notify(message) { el("toast").textContent = message; el("toast").classList.add("show"); setTimeout(() => el("toast").classList.remove("show"), 2300); }
el("openCart").onclick = () => toggleCart(true); el("closeCart").onclick = () => toggleCart(false); el("backdrop").onclick = () => toggleCart(false);
el("searchInput").oninput = (event) => { state.filter = event.target.value.replace(/\D/g, ""); document.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active")); renderTickets(); };
document.querySelectorAll(".chip").forEach((chip) => chip.onclick = () => { state.filter = chip.dataset.filter; el("searchInput").value = state.filter; document.querySelectorAll(".chip").forEach((item) => item.classList.toggle("active", item === chip)); renderTickets(); });
el("checkout").onclick = () => notify("ตัวอย่างหน้าเว็บ: เชื่อม payment gateway และยืนยันตัวตนก่อนเปิดใช้งานจริง");
let currentRotation = 0;
let lastLuckyNumber = "";
el("spinButton").onclick = () => {
  const button = el("spinButton");
  button.disabled = true;
  lastLuckyNumber = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
  currentRotation += 1440 + Math.floor(Math.random() * 1440);
  el("wheel").style.transform = `rotate(${currentRotation}deg)`;
  el("luckyResult").textContent = "กำลังสุ่มเลข...";
  setTimeout(() => { el("luckyResult").textContent = lastLuckyNumber.split("").join(" "); el("searchLucky").disabled = false; button.disabled = false; notify(`เลขนำโชคของคุณคือ ${lastLuckyNumber}`); }, 3900);
};
el("searchLucky").onclick = () => { state.filter = lastLuckyNumber; el("searchInput").value = lastLuckyNumber; document.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active")); renderTickets(); document.querySelector("#tickets").scrollIntoView({ behavior: "smooth" }); };
renderTickets(); renderCart();

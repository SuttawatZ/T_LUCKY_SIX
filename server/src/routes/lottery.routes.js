const express = require("express");
const controller = require("../controllers/lottery.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();
router.get("/draws", controller.getDraws);
router.get("/dashboard", controller.getDashboard);
router.get("/results", controller.getResults);
router.get("/tickets", controller.getTickets);
router.post("/admin/tickets", requireAuth, requireRole("admin"), controller.createTicket);
router.get("/admin/tickets", requireAuth, requireRole("admin"), controller.listAdminTickets);
router.patch("/admin/tickets/:id", requireAuth, requireRole("admin"), controller.updateTicket);
router.delete("/admin/tickets/:id", requireAuth, requireRole("admin"), controller.deleteTicket);
router.get("/admin/orders", requireAuth, requireRole("admin"), controller.listOrders);
router.patch("/admin/orders/:id/approve-payment", requireAuth, requireRole("admin"), controller.approvePayment);
router.patch("/admin/draws/:id/results", requireAuth, requireRole("admin"), controller.publishResults);
router.get("/carts/:ownerKey", controller.getCart);
router.post("/carts/items", controller.addToCart);
router.delete("/carts/items", controller.removeFromCart);
router.post("/orders", controller.createOrder);

module.exports = router;

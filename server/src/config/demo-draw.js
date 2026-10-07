const { getBangkokCutoff } = require("./draw-config");

const DEMO_CURRENT_DRAW_DATE = new Date("2026-10-16T10:00:00+07:00");
const DEMO_CURRENT_DRAW_LABEL = "งวด 16 ตุลาคม 2569";
const DEMO_SALE_START_AT = new Date("2026-10-01T15:00:00+07:00");
const DEMO_SALE_END_AT = getBangkokCutoff(DEMO_CURRENT_DRAW_DATE);

module.exports = { DEMO_CURRENT_DRAW_DATE, DEMO_CURRENT_DRAW_LABEL, DEMO_SALE_START_AT, DEMO_SALE_END_AT };

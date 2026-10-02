/**
 * Mentra Manager — Default Form & Paper Settings Template
 * ไฟล์นี้ถูกคอมมิตขึ้น GitHub เพื่อให้ Vercel และทุกโดเมนดึงค่าการตั้งค่าหน้ากระดาษเริ่มต้นได้ทันที
 * เมื่อเปิดเว็บครั้งแรกในโดเมนใหม่ (ที่ยังไม่มี localStorage) ระบบจะใช้ค่าเริ่มต้นจากไฟล์นี้อัตโนมัติ
 */

window.MENTRA_DEFAULT_TEMPLATES = window.MENTRA_DEFAULT_TEMPLATES || {
    "บริษัท เมนทร้า โซลูชั่น จำกัด (สำนักงานใหญ่)": {
        primaryColor: "#1A6FBF",
        showLogo: true,
        logoSize: "56",
        fontSize: "11",
        headerFontSize: "11",
        rowPadding: "5",
        hdrPadding: "6.5",
        tableMarginTop: "0",
        sellerName: "นายวัฒนชัย เตียวแก",
        sellerRole: "ผู้มีอำนาจลงนาม",
        leftSignerTitle: "ผู้สั่งซื้อ",
        buyerRole: "ผู้มีอำนาจลงนาม",
        sincerelyYours: "ขอแสดงความนับถือ / Sincerely Yours,",
        headerDirection: "row",
        headerRows: "3",
        headerTextAlign: "auto",
        headerVAlign: "flex-start",
        fontFamily: "Sarabun",
        fontWeight: "400",
        tableBorder: "rounded",
        tableHeaderAlign: "auto",
        tableHeaderStyle: "solid",
        zebraStripes: true,
        showRemark: true,
        bahtTextPosition: "right",
        showHeaderLine: true,
        signatureFormat: "full",
        signatureSize: "40",
        useSignatureImage: false,
        activeSignatures: [],
        signatureImage: "",
        signatureImageSize: 45,
        signatureOffsetX: 0,
        signatureOffsetY: 0,
        introText: "ทางบริษัทฯ มีความยินดีขอเสนอราคาเพื่อพิจารณา ดังมีรายละเอียดต่อไปนี้:",
        issuerName: "บริษัท เมนทร้า โซลูชั่น จำกัด (สำนักงานใหญ่)",
        issuerCustomName: "บริษัท เมนทร้า โซลูชั่น จำกัด (สำนักงานใหญ่)",
        contactBreakMode: "2-lines",
        autoPageBreak: true,
        itemsPage1: "14",
        itemsPage2Plus: "18",
        headerLayout: {
            left: ["block-logo", "block-company"],
            center: [],
            right: ["block-title"],
            midLeft: [],
            midCenter: [],
            midRight: [],
            botLeft: [],
            botCenter: [],
            botRight: []
        },
        headerFlex: {
            left: "2",
            center: "0.2",
            right: "1.2",
            midLeft: "1", midCenter: "1", midRight: "1",
            botLeft: "1", botCenter: "1", botRight: "1"
        },
        infoPanelOrder: ["pRecipientPanel", "pInfoResizer", "pDocDetailsPanel"],
        infoPanelLeftFlex: "1.4",
        infoPanelRightFlex: "0.6",
        infoDivider: true,
        recipientTitle: "RECIPIENT INFORMATION",
        docDetailsTitle: "DOCUMENT DETAILS",
        infoLabels: {
            to: "ชื่อ / To:",
            address: "ที่อยู่:",
            attn: "ติดต่อ / Attn:",
            tel: "โทร / Tel:",
            email: "อีเมล:",
            refNo: "เลขที่ / Ref. No:",
            date: "วันที่ / Date:",
            validity: "ยืนราคา / Validity:",
            delivery: "ส่งมอบ / Delivery:",
            payment: "ชำระเงิน / Payment:"
        }
    }
};

window.MENTRA_DEFAULT_GLOBAL_TYPOGRAPHY = window.MENTRA_DEFAULT_GLOBAL_TYPOGRAPHY || {
    fontFamily: "Sarabun",
    fontWeight: "400",
    fontSize: "11",
    headerFontSize: "11",
    rowPadding: "5",
    hdrPadding: "6.5",
    tableBorder: "rounded",
    tableHeaderStyle: "solid",
    tableHeaderAlign: "auto",
    zebraStripes: true,
    autoPageBreak: true
};

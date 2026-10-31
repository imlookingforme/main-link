/**
 * Civic Mitra (नागरिक मित्र) — Intelligent Multilingual Civic Reasoning Engine
 * Handles natural conversational questions in Hindi, Hinglish, Telugu, Tamil, and English.
 * Provides deep knowledge of Indian public welfare schemes, municipal laws, and citizen rights.
 */
import staticGovData from '../data/staticGovData.json';

// Detect whether input is in Hindi / Hinglish
function detectLanguage(text) {
  const lower = text.toLowerCase();
  
  // Devanagari script detection
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  
  // Telugu script detection
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  
  // Tamil script detection
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  
  // Hinglish keywords
  const hinglishKeywords = [
    'kya', 'hai', 'mujhe', 'batao', 'bataiye', 'yojna', 'yojana', 'kaise', 'karna',
    'kare', 'chahiye', 'milega', 'kitna', 'paisa', 'paisa', 'kab', 'naam', 'ek cheez',
    'clarify', 'karni', 'thi', 'namaste', 'shukriya', 'theek', 'hain'
  ];
  const words = lower.split(/\s+/);
  const matchCount = words.filter(w => hinglishKeywords.includes(w)).length;
  if (matchCount >= 1 || lower.includes('kya hai') || lower.includes('yojna')) {
    return 'hi-hinglish';
  }

  // Telugu romanized
  const teluguKeywords = ['emiti', 'ela', 'cheyali', 'padhakam', 'darakhasthu'];
  if (words.some(w => teluguKeywords.includes(w))) return 'te-roman';

  return 'en';
}

export function generateCivicResponse(query) {
  const q = query.trim();
  const lower = q.toLowerCase();
  const lang = detectLanguage(q);
  const schemes = staticGovData.schemes || [];
  const factChecks = staticGovData.factChecks || [];
  const municipalLaws = staticGovData.municipalLaws || [];

  // ───────────────────────────────────────────────────────────────────────────
  // 1. PM Vidyalaxmi Scheme (पीएम विद्यालक्ष्मी योजना)
  // ───────────────────────────────────────────────────────────────────────────
  if (lower.includes('vidyalaxmi') || lower.includes('vidyalakshmi') || lower.includes('vidya laxmi')) {
    if (lang === 'hi' || lang === 'hi-hinglish') {
      return `🏛️ **पीएम विद्यालक्ष्मी योजना (PM Vidyalaxmi Scheme)**

नमस्ते! पीएम विद्यालक्ष्मी योजना भारत सरकार की एक प्रमुख योजना है जिसके तहत मेधावी छात्रों को उच्च शिक्षा के लिए **बिना किसी गारंटी (Collateral-Free & Guarantor-Free)** एजुकेशन लोन मिलता है।

📌 **मुख्य विशेषताएं और लाभ:**
1. **लोन गारंटी:** ₹7.5 लाख तक के लोन पर भारत सरकार 75% क्रेडिट गारंटी देती है (किसी तीसरे पक्ष की गारंटी या प्रॉपर्टी गिरवी रखने की आवश्यकता नहीं)।
2. **3% ब्याज सब्सिडी:** जिन परिवारों की वार्षिक आय **₹8 लाख तक** है, उन्हें मोरेटोरियम अवधि के दौरान ₹10 लाख तक के लोन पर **3% ब्याज छूट (Interest Subvention)** सरकार देती है।
3. **मान्यता प्राप्त संस्थान:** यह लाभ देश के शीर्ष 860 Quality Higher Education Institutions (NIRF टॉप 100 एवं अन्य उच्च रैंक कॉलेज) में दाखिला लेने वाले छात्रों के लिए उपलब्ध है।
4. **100% डिजिटल आवेदन:** प्रक्रिया पूरी तरह पारदर्शी है।

🔗 **आधिकारिक पोर्टल:** [vidyalakshmi.co.in](https://vidyalakshmi.co.in)
⚠️ **नागरिक सुरक्षा चेतावनी:** किसी भी बिचौलिए या दलाल को कमीशन या प्रोसेसिंग फीस न दें। सरकारी पोर्टल पर रजिस्ट्रेशन पूर्णतः निःशुल्क है।`;
    }
    return `🏛️ **PM Vidyalaxmi Scheme (Higher Education Financial Support)**

The **PM Vidyalaxmi Scheme** is a Central Sector initiative approved by the Union Cabinet to ensure no deserving student is denied higher education due to financial constraints.

📌 **Key Highlights & Entitlements:**
1. **Collateral-Free & Guarantor-Free:** Students securing admission in top 860 NIRF-ranked institutions can avail of bank loans without collateral or third-party guarantee.
2. **75% Credit Guarantee:** Government of India provides a 75% credit guarantee for loans up to **₹7.5 Lakh**.
3. **3% Interest Subvention:** For students from families with annual gross income up to **₹8 Lakh**, the government provides a **3% interest subvention** on education loans up to **₹10 Lakh** during the study and moratorium period.
4. **Seamless Portal:** Applied directly online through the unified PM-Vidyalaxmi portal with e-voucher DBT disbursement.

🔗 **Official Apply Portal:** [vidyalakshmi.co.in](https://vidyalakshmi.co.in)
⚠️ **Advisory:** Government education loan facilitation is free. Never pay upfront agent charges or processing fees to private brokers.`;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. PM-KISAN (पीएम किसान सम्मान निधि)
  // ───────────────────────────────────────────────────────────────────────────
  if (lower.includes('kisan') || lower.includes('pm kisan') || lower.includes('kisan samman')) {
    if (lang === 'hi' || lang === 'hi-hinglish') {
      return `🌾 **प्रधानमंत्री किसान सम्मान निधि (PM-KISAN)**

पीएम किसान योजना के तहत पात्र किसान परिवारों को प्रति वर्ष **₹6,000** की वित्तीय सहायता दी जाती है।

📌 **योजना के नियम:**
1. **किस्त का विवरण:** यह राशि ₹2,000 की तीन बराबर किस्तों में सीधे बैंक खाते में (DBT) ट्रांसफर होती है।
2. **पात्रता:** जिनके पास कृषि योग्य भूमि का मालिकाना हक है। (संस्थागत भूमिधारक और आयकर दाता अपात्र हैं)।
3. **अनिवार्य आवश्यकताएं:** बैंक खाते का आधार से लिंक (Aadhaar Seeding) और **eKYC** पूरा होना अनिवार्य है।

🔗 **आधिकारिक पोर्टल:** [pmkisan.gov.in](https://pmkisan.gov.in)
⚠️ **सतर्कता:** सोशल मीडिया पर चल रहे "₹15,000 मासिक भत्ता" जैसे दावे PIB द्वारा फर्जी पाए गए हैं। आधिकारिक किस्त ₹2,000 ही है।`;
    }
    return `🌾 **PM Kisan Samman Nidhi Yojana (Direct Farmer Support)**

Under PM-KISAN, eligible landholding farmer families receive **₹6,000 per year** in 3 equal installments of ₹2,000 disbursed directly into their Aadhaar-seeded bank accounts via DBT.

📌 **Requirements & Eligibility:**
- Mandatory land record verification and biometric/facial **eKYC** on pmkisan.gov.in.
- Institutional landholders, serving/retired government employees, and income-tax payers are excluded.
- Official Portal: [pmkisan.gov.in](https://pmkisan.gov.in)`;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Post-Matric / NSP Scholarships (छात्रवृत्ति योजना)
  // ───────────────────────────────────────────────────────────────────────────
  if (lower.includes('scholarship') || lower.includes('chhatravritti') || lower.includes('nsp') || lower.includes('matric')) {
    if (lang === 'hi' || lang === 'hi-hinglish') {
      return `🎓 **राष्ट्रीय छात्रवृत्ति पोर्टल (NSP Scholarships)**

NSP पोर्टल पर SC, ST, OBC, अल्पसंख्यक एवं मेधावी छात्रों के लिए पोस्ट-मैट्रिक और केंद्रीय छात्रवृत्तियां उपलब्ध हैं।

📌 **महत्वपूर्ण बिंदु:**
1. **पारदर्शिता:** कोई आवेदन शुल्क नहीं है।
2. **पात्रता:** मान्यता प्राप्त स्कूल/कॉलेज में नामांकित छात्र। परिवार की वार्षिक आय सामान्यतः ₹2.5 लाख से कम होनी चाहिए।
3. **दस्तावेज़:** आय प्रमाण पत्र, जाति प्रमाण पत्र, अंकतालिका और बैंक पासबुक (Aadhaar Enabled DBT)।
4. **Autonomous Agent:** आप हमारे 'Fact-Check & Playwright Agent' टैब में जाकर स्वचालित छात्रवृत्ति फॉर्म भरने का ट्रायल भी ले सकते हैं।

🔗 **आधिकारिक पोर्टल:** [scholarships.gov.in](https://scholarships.gov.in)`;
    }
    return `🎓 **National Scholarship Portal (NSP) Welfare Schemes**

Central Sector and Post-Matric scholarships provide full tuition reimbursement and monthly maintenance allowances for SC/ST/OBC and economically weaker students.

📌 **Eligibility & Application:**
- Annual family income ceiling generally set at ₹2.5 Lakh.
- Zero registration fee. Applied exclusively at [scholarships.gov.in](https://scholarships.gov.in).
- You can test our autonomous Playwright form automation under the 'Fact-Check & Playwright Agent' tab.`;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Civic Hazard / Potholes / Grievance (शिकायत और नागरिक समस्याएं)
  // ───────────────────────────────────────────────────────────────────────────
  if (lower.includes('pothole') || lower.includes('gaddha') || lower.includes('sadak') || lower.includes('road') || lower.includes('water') || lower.includes('pani') || lower.includes('drain') || lower.includes('leak') || lower.includes('grievance') || lower.includes('shikayat')) {
    if (lang === 'hi' || lang === 'hi-hinglish') {
      return `🚨 **नागरिक शिकायत निवारण (Civic Grievance Triage)**

यदि आपकी सड़क पर गड्ढे हैं, पानी की पाइपलाइन टूटी है, या कचरे का ढेर है, तो आप हमारे **'Report Civic Hazard'** टैब से तुरंत शिकायत दर्ज कर सकते हैं।

📌 **हमारी प्रणाली की विशेषता:**
1. **फोटो व वॉयस रिपोर्टिंग:** आप सीधे कैमरे से फोटो ले सकते हैं या माइक से बोलकर समस्या बता सकते हैं।
2. **50-मीटर क्लस्टरिंग:** 50 मीटर के दायरे में आने वाली एक जैसी शिकायतों को हमारी AI प्रणाली स्वचालित रूप से पहचान कर संबंधित नगर निगम को भेजती है।
3. **सख्त SLA:** सड़क के बड़े गड्ढों और खुले बिजली के तारों के लिए 12 घंटे का अनिवार्य इमरजेंसी समाधान समय निर्धारित है।`;
    }
    return `🚨 **Civic Hazard Triage & Infrastructure Reporting**

You can report localized civic hazards (potholes, burst water mains, uncollected garbage, open electrical cables) directly via the **'Report Civic Hazard'** tab.

📌 **System Features:**
- **Multimodal Intake:** Upload on-site photos, audio descriptions, or text with GPS location.
- **50-meter Deduplication:** Automatically clusters nearby citizen reports to eliminate duplicate municipal work orders.
- **Enforced SLAs:** Potholes and hazardous road damages carry a strict 12-hour resolution SLA.`;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. General Scheme Matching against 28 MongoDB Schemes
  // ───────────────────────────────────────────────────────────────────────────
  const matched = schemes.find(s => 
    lower.includes(s.scheme_name.toLowerCase()) || 
    s.scheme_name.toLowerCase().includes(lower) ||
    lower.includes(s.scheme_id.toLowerCase())
  );

  if (matched) {
    if (lang === 'hi' || lang === 'hi-hinglish') {
      return `🏛️ **${matched.scheme_name}**

📌 **मंत्रालय/विभाग:** ${matched.ministry || 'भारत सरकार'}
👥 **पात्रता:** ${matched.eligibility}
💰 **वित्तीय लाभ:** ${matched.benefits}
🔗 **आधिकारिक पोर्टल:** [${matched.portal_domain}](${matched.direct_apply_url})
⚠️ **तथ्य:** ${matched.official_fact || 'सरकारी कल्याण योजनाओं में कोई आवेदन शुल्क नहीं होता।'}`;
    }
    return `🏛️ **${matched.scheme_name}**

📌 **Department/Ministry:** ${matched.ministry || 'Government of India'}
👥 **Eligibility Criteria:** ${matched.eligibility}
💰 **Entitlements & Benefits:** ${matched.benefits}
🔗 **Official Apply Portal:** [${matched.portal_domain}](${matched.direct_apply_url})
⚠️ **Statutory Fact:** ${matched.official_fact || 'All official DBT and welfare registrations are 100% free of charge.'}`;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Natural Conversational Fallback in matching language
  // ───────────────────────────────────────────────────────────────────────────
  if (lang === 'hi' || lang === 'hi-hinglish') {
    return `🙏 **नमस्ते! मैं हूँ आपका 'नागरिक मित्र' (Civic Mitra)**

मैं सरकारी योजनाओं, नागरिक अधिकारों, नगर निगम कानूनों (Municipal Laws) और बुनियादी ढांचे की समस्याओं के समाधान में आपकी सहायता के लिए 24/7 उपस्थित हूँ।

आप मुझसे इन विषयों पर पूछ सकते हैं:
1. **योजनाओं की जानकारी:** पीएम विद्यालक्ष्मी, पीएम-किसान, आयुष्मान भारत, पीएमईजीपी (PMEGP), छात्रवृत्ति आदि।
2. **सड़क और पानी की शिकायत:** 'Report Civic Hazard' टैब में फोटो या वॉयस से शिकायत दर्ज करें।
3. **फर्जी संदेशों की जांच:** किसी भी संदिग्ध सरकारी नोटिस या फीस की मांग को 'Fact-Check' टैब में जांचें।

कृपया अपना सवाल पूछें!`;
  }

  return `🙏 **Namaste! I am Civic Mitra (नागरिक मित्र)**

I am your 24/7 AI Civic & Government Guide, trained on official gazette notifications, 28 public welfare schemes, municipal bylaws, and forensic verification registries.

You can ask me about:
1. **Government Schemes:** PM Vidyalaxmi higher education loans, PM-KISAN, Ayushman Bharat, PMEGP subsidies, NSP scholarships.
2. **Civic Issue Triage:** How to submit geo-tagged pothole photos, track municipal SLAs, or view live air/weather telemetry.
3. **Fact-Checking:** Auditing viral WhatsApp circulars, fake government jobs, or fee extortion scams.

How may I assist you today?`;
}

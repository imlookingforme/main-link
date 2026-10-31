/**
 * Civic Mitra (नागरिक मित्र) — Intelligent Multilingual Civic Reasoning Engine
 * Supports authentic regional Indian languages: Telugu, Hindi, Tamil, Kannada, Bengali, Marathi, Gujarati, English.
 * Provides deep knowledge of 5,000+ Indian public welfare schemes, municipal laws, and citizen rights.
 */
import staticGovData from '../data/staticGovData.json';

export function normalizeLang(lang) {
  if (!lang) return 'en';
  const l = lang.toLowerCase();
  if (l.includes('telugu') || l === 'te') return 'te';
  if (l.includes('hindi') || l.includes('hinglish') || l === 'hi') return 'hi';
  if (l.includes('tamil') || l === 'ta') return 'ta';
  if (l.includes('kannada') || l === 'kn') return 'kn';
  if (l.includes('bengali') || l === 'bn') return 'bn';
  if (l.includes('marathi') || l === 'mr') return 'mr';
  if (l.includes('gujarati') || l === 'gu') return 'gu';
  return 'en';
}

export function generateCivicResponse(query, preferredLanguage = 'English') {
  const q = (query || '').trim();
  const lower = q.toLowerCase();
  const lang = normalizeLang(preferredLanguage);

  // 1. PM Vidyalaxmi Scheme
  if (lower.includes('vidyalaxmi') || lower.includes('vidyalakshmi') || lower.includes('vidya laxmi')) {
    if (lang === 'te') {
      return `🏛️ **పిఎం విద్యాలక్ష్మి పథకం (PM Vidyalaxmi Scheme)**

నమస్కారం! పిఎం విద్యాలక్ష్మి పథకం ద్వారా దేశంలోని టాప్ 860 NIRF-ర్యాంక్ ఉన్నత విద్యాసంస్థల్లో ప్రవేశం పొందిన విద్యార్థులకు **ఎటువంటి పూచీకత్తు లేదా హామీదారు లేకుండా (Collateral-Free & Guarantor-Free)** విద్యారుణాలు అందుతాయి.

📌 **ప్రధాన ప్రయోజనాలు & అర్హతలు:**
1. **₹7.5 లక్షల వరకు 75% ప్రభుత్వ క్రెడిట్ గ్యారెంటీ** (ఆస్తి కుదువ పెట్టాల్సిన పనిలేదు).
2. **3% వడ్డీ సబ్సిడీ:** వార్షిక కుటుంబ ఆదాయం ₹8 లక్షల లోపు ఉన్న విద్యార్థులకు ₹10 లక్షల వరకు రుణాలపై కోర్సు & మోరటోరియం సమయంలో 3% వడ్డీ రాయితీ లభిస్తుంది.
3. **యూనిఫైడ్ డిజిటల్ పోర్టల్:** పూర్తి పారదర్శకమైన ఆన్‌లైన్ దరఖాస్తు మరియు ఈ-వోచర్ DBT పంపిణీ.

🔗 **అధికారిక దరఖాస్తు పోర్టల్:** [vidyalakshmi.co.in](https://vidyalakshmi.co.in)
⚠️ **పౌర భద్రతా హెచ్చరిక:** ఈ ప్రభుత్వ విద్యా రుణ ప్రక్రియ పూర్తిగా ఉచితం. ఏ దళారులకు లేదా ఏజెంట్లకు ఎటువంటి కమీషన్ చెల్లించవద్దు.`;
    }
    if (lang === 'ta') {
      return `🏛️ **பிஎம் வித்யாலக்ஷ்மி திட்டம் (PM Vidyalaxmi Scheme)**

வணக்கம்! இந்தியாவில் உள்ள முன்னணி 860 NIRF தரவரிசை உயர்கல்வி நிறுவனங்களில் சேரும் மாணவர்களுக்கு **எந்தவித பிணையமும் இன்றி (Collateral-Free & Guarantor-Free)** கல்விக் கடன் வழங்கும் மத்திய அரசுத் திட்டம் இதுவாகும்.

📌 **முக்கிய நன்மைகள் & தகுதிகள்:**
1. **₹7.5 லட்சம் வரையிலான கடன்களுக்கு 75% அரசு கடன் உத்தரவாதம்.**
2. **3% வட்டி மானியம்:** ஆண்டு குடும்ப வருமானம் ₹8 லட்சத்திற்கு உட்பட்ட மாணவர்களுக்கு, ₹10 லட்சம் வரையிலான கடன்களுக்கு 3% வட்டி சலுகை.
3. **நேரடி டிஜிட்டல் முறை:** இடைத்தரகர்கள் இன்றி ஆன்லைனில் எளிதாக விண்ணப்பிக்கலாம்.

🔗 **அதிகாரப்பூர்வ தளம்:** [vidyalakshmi.co.in](https://vidyalakshmi.co.in)
⚠️ **எச்சரிக்கை:** அரசு கல்விக் கடன் விண்ணப்பம் முற்றிலும் இலவசம். தனியார் ஏஜெண்டுகளுக்கு கட்டணம் செலுத்த வேண்டாம்.`;
    }
    if (lang === 'kn') {
      return `🏛️ **ಪಿಎಂ ವಿದ್ಯಾಲಕ್ಷ್ಮಿ ಯೋಜನೆ (PM Vidyalaxmi Scheme)**

ನಮಸ್ಕಾರ! ದೇಶದ ಅಗ್ರ 860 NIRF-ಶ್ರೇಯಾಂಕಿತ ಗುಣಮಟ್ಟದ ಉನ್ನತ ಶಿಕ್ಷಣ ಸಂಸ್ಥೆಗಳಲ್ಲಿ ಪ್ರವೇಶ ಪಡೆಯುವ ಅರ್ಹ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ **ಯಾವುದೇ ಭದ್ರತೆ ಅಥವಾ ಜಾಮೀನುದಾರರಿಲ್ಲದೆ (Collateral-Free)** ಶಿಕ್ಷಣ ಸಾಲವನ್ನು ಒದಗಿಸುವ ಯೋಜನೆಯಾಗಿದೆ.

📌 **ಪ್ರಮುಖ ಸೌಲಭ್ಯಗಳು:**
1. **₹7.5 ಲಕ್ಷದವರೆಗಿನ ಸಾಲಕ್ಕೆ 75% ಸರ್ಕಾರಿ ಕ್ರೆಡಿಟ್ ಗ್ಯಾರಂಟಿ.**
2. **3% ಬಡ್ಡಿ ಸಬ್ಸಿಡಿ:** ವಾರ್ಷಿಕ ಆದಾಯ ₹8 ಲಕ್ಷದೊಳಗಿರುವ ಕುಟುಂಬಗಳಿಗೆ ₹10 ಲಕ್ಷದವರೆಗಿನ ಸಾಲಕ್ಕೆ 3% ಬಡ್ಡಿ ವಿನಾಯಿತಿ.

🔗 **ಅಧಿಕೃತ ಪೋರ್ಟಲ್:** [vidyalakshmi.co.in](https://vidyalakshmi.co.in)
⚠️ **ಎಚ್ಚರಿಕೆ:** ಸರ್ಕಾರಿ ಸಾಲದ ಪ್ರಕ್ರಿಯೆ ಸಂಪೂರ್ಣ ಉಚಿತವಾಗಿದೆ. ಮಧ್ಯವರ್ತಿಗಳಿಗೆ ಶುಲ್ಕ ನೀಡಬೇಡಿ.`;
    }
    if (lang === 'bn') {
      return `🏛️ **পিএম বিদ্যলক্ষ্মী যোজনা (PM Vidyalaxmi Scheme)**

নমস্কার! পিএম বিদ্যলক্ষ্মী যোজনা হলো শীর্ষস্থানীয় ৮৬০টি NIRF-র‍্যাঙ্কড উচ্চশিক্ষা প্রতিষ্ঠানে ভর্তির সুযোগ পাওয়া শিক্ষার্থীদের জন্য **জামানতমুক্ত (Collateral-Free)** শিক্ষা ঋণের একটি ঐতিহাসিক কেন্দ্রীয় প্রকল্প।

📌 **মূল সুবিধাসমূহ:**
1. **₹৭.৫ লাখ পর্যন্ত ঋণে ৭৫% সরকারি ক্রেডিট গ্যারান্টি।**
2. **৩% সুদের ভর্তুকি:** বার্ষিক ₹৮ লাখ পর্যন্ত পারিবারিক আয়ের পরিবারের জন্য ₹১০ লাখ পর্যন্ত ঋণে ৩% সুদ মকুব।

🔗 **অফিসিয়াল পোর্টাল:** [vidyalakshmi.co.in](https://vidyalakshmi.co.in)
⚠️ **সতর্কতা:** আবেদন প্রক্রিয়া সম্পূর্ণ বিনামূল্যে। কোনো দালালকে টাকা দেবেন না।`;
    }
    if (lang === 'hi') {
      return `🏛️ **पीएम विद्यालक्ष्मी योजना (PM Vidyalaxmi Scheme)**

नमस्ते! पीएम विद्यालक्ष्मी योजना भारत सरकार की एक प्रमुख योजना है जिसके तहत देश के टॉप 860 NIRF-रैंक्ड उच्च शिक्षण संस्थानों में प्रवेश पाने वाले मेधावी छात्रों को **बिना किसी गारंटी (Collateral-Free & Guarantor-Free)** एजुकेशन लोन मिलता है।

📌 **मुख्य विशेषताएं और लाभ:**
1. **लोन गारंटी:** ₹7.5 लाख तक के लोन पर भारत सरकार 75% क्रेडिट गारंटी देती है (किसी प्रॉपर्टी या गारंटर की आवश्यकता नहीं)।
2. **3% ब्याज सब्सिडी:** जिन परिवारों की वार्षिक आय **₹8 लाख तक** है, उन्हें मोरेटोरियम अवधि के दौरान ₹10 लाख तक के लोन पर **3% ब्याज छूट (Interest Subvention)** सरकार देती है।
3. **100% पारदर्शी डिजिटल पोर्टल:** सीधा ई-वाउचर वितरण।

🔗 **आधिकारिक पोर्टल:** [vidyalakshmi.co.in](https://vidyalakshmi.co.in)
⚠️ **नागरिक सुरक्षा चेतावनी:** किसी भी बिचौलिए या दलाल को कमीशन न दें। रजिस्ट्रेशन पूर्णतः निःशुल्क है।`;
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

  // 2. PM-KISAN
  if (lower.includes('kisan') || lower.includes('farmer') || lower.includes('kheti')) {
    if (lang === 'te') {
      return `🌾 **ప్రధాన మంత్రి కిసాన్ సమ్మాన్ నిధి (PM-KISAN)**

అర్హులైన రైతు కుటుంబాలకు సంవత్సరానికి **₹6,000** ఆర్థిక సహాయం, ₹2,000 చొప్పున మూడు విడతల్లో నేరుగా వారి ఆధార్-లింక్డ్ బ్యాంక్ ఖాతాలో (DBT) జమ చేయబడుతుంది.

📌 **నియమాలు & అర్హతలు:**
1. వ్యవసాయ భూమి యాజమాన్య రికార్డులు కలిగి ఉండాలి.
2. బ్యాంక్ ఖాతాకు ఆధార్ లింక్ మరియు pmkisan.gov.in లో బయోమెట్రిక్/ఫేస్ **eKYC** పూర్తి చేసి ఉండాలి.

🔗 **అధికారిక పోర్టల్:** [pmkisan.gov.in](https://pmkisan.gov.in)
⚠️ **హెచ్చరిక:** వాట్సాప్‌లో వచ్చే "₹15,000 బోనస్" లింకులు నకిలీవి. అధికారిక సహాయం విడతకు ₹2,000 మాత్రమే.`;
    }
    if (lang === 'ta') {
      return `🌾 **பிரதான் மந்திரி கிசான் சம்மான் நிதி (PM-KISAN)**

விவசாய குடும்பங்களுக்கு ஆண்டுதோறும் **₹6,000** நிதி உதவி, ₹2,000 வீதம் 3 தவணைகளாக வங்கி கணக்கில் (DBT) நேரடியாக செலுத்தப்படுகிறது.

📌 **விதிகள்:** நில உரிமை ஆவணங்கள், ஆதார் இணைப்பு மற்றும் pmkisan.gov.in தளத்தில் eKYC கட்டாயம்.
🔗 **அதிகாரப்பூர்வ தளம்:** [pmkisan.gov.in](https://pmkisan.gov.in)`;
    }
    if (lang === 'hi') {
      return `🌾 **प्रधानमंत्री किसान सम्मान निधि (PM-KISAN)**

पीएम किसान योजना के तहत पात्र किसान परिवारों को प्रति वर्ष **₹6,000** की वित्तीय सहायता ₹2,000 की तीन बराबर किस्तों में सीधे बैंक खाते में (DBT) ट्रांसफर होती है।

📌 **योजना के नियम:**
1. भूमि स्वामित्व रिकॉर्ड, अनिवार्य आधार सीडिंग और **eKYC** अनिवार्य है।
2. आधिकारिक किस्त ₹2,000 ही है। फर्जी वाट्सऐप लिंक से बचें।

🔗 **आधिकारिक पोर्टल:** [pmkisan.gov.in](https://pmkisan.gov.in)`;
    }
    return `🌾 **PM Kisan Samman Nidhi Yojana (Direct Farmer Support)**

Under PM-KISAN, eligible landholding farmer families receive **₹6,000 per year** in 3 equal installments of ₹2,000 disbursed directly into their Aadhaar-seeded bank accounts via DBT.

📌 **Requirements & Eligibility:**
- Mandatory land record verification and biometric/facial **eKYC** on pmkisan.gov.in.
- Institutional landholders and income-tax payers are excluded.
- Official Portal: [pmkisan.gov.in](https://pmkisan.gov.in)`;
  }

  // 3. Civic Hazard Reporting
  if (lower.includes('pothole') || lower.includes('road') || lower.includes('hazard') || lower.includes('water') || lower.includes('drain') || lower.includes('waste')) {
    if (lang === 'te') {
      return `🚨 **పౌర సమస్యల రిపోర్టింగ్ (Community Hero Triage)**

రోడ్లపై ప్రమాదకరమైన గుంతలు, మంచినీటి పైప్‌లైన్ పగుళ్లు లేదా చెత్త కుప్పల సమస్యలను మా 'Report Civic Hazard' ట్యాబ్ ద్వారా క్షణాల్లో రిపోర్ట్ చేయవచ్చు.

📌 **ప్రత్యేకతలు:**
1. **లైవ్ కెమెరా & GPS వాటర్‌మార్కింగ్:** ఆధారాలతో కూడిన రిపోర్టింగ్.
2. **50 మీటర్ల క్లస్టర్ గుర్తింపు:** ఒకే ప్రాంత సమస్యలు నకిలీ కాకుండా మున్సిపల్ అధికారులకు నేరుగా వెళ్తాయి.
3. **12 గంటల అత్యవసర SLA:** తక్షణ మరమ్మతు ట్రాకింగ్ మరియు కమ్యూనిటీ వెరిఫికేషన్.`;
    }
    if (lang === 'ta') {
      return `🚨 **குடிமக்கள் இடர் அறிக்கை (Civic Hazard Reporting)**

சாலையோர குழிகள், குடிநீர் குழாய் உடைப்புகள் அல்லது கழிவுநீர் தேக்கத்தை எங்கள் 'Report Civic Hazard' பக்கத்தில் படம் பிடித்து எளிதாக பதிவு செய்யலாம்.

📌 **அம்சங்கள்:** நேரலை GPS நீர் அடையாளம், 50மீ அருகாமை ஒருங்கிணைப்பு மற்றும் 12 மணி நேர நகராட்சி SLA அவசர நடவடிக்கை.`;
    }
    if (lang === 'hi') {
      return `🚨 **नागरिक समस्या रिपोर्टिंग (Community Hero Triage)**

सड़क के गड्ढों, पाइपलाइन लीकेज, या कचरे के ढेरों की समस्या को आप सीधे हमारे 'Report Civic Hazard' टैब से लाइव कैमरा और GPS के साथ रिपोर्ट कर सकते हैं।

📌 **विशेषताएं:** 50m क्लस्टर पहचान, जेमिनी विजन इंस्टेंट ट्राइएज और 12 घंटे का इमरजेंसी SLA।`;
    }
    return `🚨 **Civic Hazard Reporting (Community Hero)**

Report localized potholes, drainage bursts, or uncollected garbage using the 'Report Civic Hazard' tab. Includes WebRTC live camera, EXIF/GPS watermarking, 50m spatial cluster deduplication, and a 12-hour municipal emergency SLA.`;
  }

  // Generic dynamic scheme match from 5,041 schemes
  const matched = (staticGovData.schemes || []).find((s) =>
    lower.split(/\s+/).some((w) => w.length > 3 && (s.scheme_name.toLowerCase().includes(w) || s.scheme_id.toLowerCase().includes(w)))
  );
  if (matched) {
    if (lang === 'te') {
      return `🏛️ **${matched.scheme_name}**\n\n**వర్గం:** ${matched.category}\n**ప్రయోజనాలు:** ${matched.benefits}\n**అర్హత:** ${matched.eligibility}\n**అధికారిక వాస్తవం:** ${matched.official_fact}\n🔗 **పోర్టల్:** ${matched.direct_apply_url || matched.portal_domain || 'myscheme.gov.in'}`;
    }
    if (lang === 'ta') {
      return `🏛️ **${matched.scheme_name}**\n\n**பிரிவு:** ${matched.category}\n**நன்மைகள்:** ${matched.benefits}\n**தகுதி:** ${matched.eligibility}\n**அதிகாரப்பூர்வ விவரம்:** ${matched.official_fact}\n🔗 **இணையதளம்:** ${matched.direct_apply_url || matched.portal_domain || 'myscheme.gov.in'}`;
    }
    if (lang === 'hi') {
      return `🏛️ **${matched.scheme_name}**\n\n**श्रेणी:** ${matched.category}\n**लाभ:** ${matched.benefits}\n**पात्रता:** ${matched.eligibility}\n**आधिकारिक तथ्य:** ${matched.official_fact}\n🔗 **आधिकारिक पोर्टल:** ${matched.direct_apply_url || matched.portal_domain || 'myscheme.gov.in'}`;
    }
    return `🏛️ **${matched.scheme_name}**\n\n**Category:** ${matched.category}\n**Benefits:** ${matched.benefits}\n**Eligibility:** ${matched.eligibility}\n**Official Fact:** ${matched.official_fact}\n🔗 **Official Portal:** ${matched.direct_apply_url || matched.portal_domain || 'myscheme.gov.in'}`;
  }

  // Default greeting / guide
  if (lang === 'te') {
    return `🏛️ **సివిక్ మిత్ర (Civic Mitra) — మీ 24/7 పౌర సహాయకుడు**

నమస్కారం! మా డేటాబేస్‌లోని 5,040+ పైగా ధృవీకరించబడిన ప్రభుత్వ సంక్షేమ పథకాలు, పౌర హక్కులు మరియు మున్సిపల్ నిబంధనల గురించి మీరు తెలుగులో అడగవచ్చు. (ఉదాహరణకు: పిఎం విద్యాలక్ష్మి, పిఎం కిసాన్, ఉపకారవేతనాలు, లేదా రోడ్డు సమస్యలు)!`;
  }
  if (lang === 'ta') {
    return `🏛️ **சிவிக் மித்ரா (Civic Mitra) — உங்கள் அரசு வழிகாட்டி**

வணக்கம்! எங்கள் தரவுத்தளத்தில் உள்ள 5,040+ அரசு நலத்திட்டங்கள், குடிமக்கள் உரிமைகள் மற்றும் நகராட்சி சட்டங்கள் பற்றி தமிழில் கேட்கலாம்.`;
  }
  if (lang === 'hi') {
    return `🏛️ **मुख्य-लिंक नागरिक मित्र (Civic Mitra)**

नमस्ते! आप हमारे '📢 Policy, Rights & Scheme Database' टैब में 5,040 से अधिक सत्यापित सरकारी योजनाओं की जानकारी देख सकते हैं, या 'Report Civic Hazard' टैब में स्थानीय नागरिक समस्याओं की रिपोर्ट कर सकते हैं। आप किसी भी योजना के बारे में पूछ सकते हैं!`;
  }
  return `🏛️ **main-link Civic Mitra Assistant**

Hello! You can explore our verified database of ${staticGovData.schemes?.length || 5041} official government schemes in the '📢 Policy, Rights & Scheme Database' tab, or submit localized issues in the 'Report Civic Hazard' tab. Feel free to ask about any scheme (such as PM Vidyalaxmi, PM-KISAN, NSP scholarships, or civic rights)!`;
}

export function generatePolicyFallback(schemeOrTopic, language = 'English', targetAudience = 'Citizen') {
  const lang = normalizeLang(language);
  const q = schemeOrTopic.trim();
  const matched = (staticGovData.schemes || []).find(s =>
    s.scheme_name.toLowerCase().includes(q.toLowerCase()) ||
    q.toLowerCase().includes(s.scheme_name.toLowerCase())
  );

  const title = matched ? matched.scheme_name : q;
  const portalUrl = matched ? (matched.direct_apply_url || matched.portal_domain || 'https://myscheme.gov.in') : 'https://myscheme.gov.in';

  if (lang === 'te') {
    const rights = matched ? `${title} కింద అర్హులైన భారతీయ పౌరులకు చట్టబద్ధమైన సంక్షేమ హక్కులు మరియు సబ్సిడీ ప్రయోజనాలు నేరుగా అందుతాయి.` : `${q} కింద అర్హులైన పౌరులకు ఎటువంటి మధ్యవర్తుల రుసుము లేకుండా ప్రభుత్వం నుండి ప్రత్యక్ష సహాయం పొందే చట్టబద్ధమైన హక్కు ఉంది.`;
    const eligibility = matched ? matched.eligibility : `ఆధార్ అనుసంధాన బ్యాంక్ ఖాతా కలిగిన భారతీయ పౌరులు మరియు నిర్దేశిత ఆదాయ పరిమితి లోపు ఉన్న కుటుంబాలు అర్హులు.`;
    const subsidies = matched ? (matched.financial_benefit || matched.benefits) : `డైరెక్ట్ బెనిఫిట్ ట్రాన్స్‌ఫర్ (DBT) లేదా వడ్డీ సబ్సిడీ ప్రయోజనాలు నేరుగా బ్యాంకు ఖాతాలో జమవుతాయి.`;
    const spoken = `నమస్కారం! ${title} గురించి మీ అధికారిక సమాచారం ఇది. ఈ ప్రభుత్వ పథకం ద్వారా అర్హులైన పౌరులు దళారుల ఫీజు లేకుండా నేరుగా ప్రయోజనాలు పొందవచ్చు. దరఖాస్తు పూర్తిగా ఉచితం.`;
    return {
      title,
      rightsSummary: rights,
      eligibility,
      subsidiesAndBenefits: subsidies,
      citizenExplainer: spoken,
      officialPortalUrl: portalUrl,
      applicationDeadline: 'నిరంతరం తెరిచి ఉంటుంది (Ongoing)'
    };
  }

  if (lang === 'hi') {
    const rights = matched ? `${title} के तहत पात्र भारतीय नागरिकों को सीधे कानूनी कल्याणकारी अधिकार और सब्सिडी प्राप्त करने का अधिकार है।` : `${q} के अंतर्गत पात्र नागरिकों को बिना किसी बिचौलिए या कमीशन के सीधे सरकारी सहायता प्राप्त करने का वैधानिक अधिकार है।`;
    const eligibility = matched ? matched.eligibility : `आधार-लिंक्ड बैंक खाते वाले भारतीय निवासी और निर्धारित पारिवारिक आय सीमा के अंतर्गत आने वाले व्यक्ति।`;
    const subsidies = matched ? (matched.financial_benefit || matched.benefits) : `सीधे बैंक खाते में डीबीटी (DBT) सब्सिडी अथवा रियायती संस्थागत ऋण सहायता।`;
    const spoken = `नमस्ते। ${title} के लिए यह आपकी आधिकारिक मार्गदर्शिका है। इस सरकारी योजना के तहत पात्र नागरिक बिना किसी दलाल या फीस के सीधे लाभ प्राप्त कर सकते हैं। आवेदन पूर्णतः निःशुल्क है।`;
    return {
      title,
      rightsSummary: rights,
      eligibility,
      subsidiesAndBenefits: subsidies,
      citizenExplainer: spoken,
      officialPortalUrl: portalUrl,
      applicationDeadline: 'सक्रिय / निरंतर (Ongoing)'
    };
  }

  if (lang === 'ta') {
    const rights = `${title} திட்டத்தின் கீழ் தகுதியான குடிமக்கள் எவ்வித இடைத்தரகர் கட்டணமும் இன்றி அரசு உதவிகளை நேரடியாகப் பெற முழு உரிமை உண்டு.`;
    const eligibility = `ஆதார் இணைக்கப்பட்ட வங்கி கணக்கு கொண்ட இந்திய குடிமக்கள்.`;
    const subsidies = `நேரடி வங்கி பரிமாற்றம் (DBT) அல்லது வட்டி மானிய நிதி உதவி.`;
    const spoken = `வணக்கம்! ${title} திட்டத்தின் கீழ் தகுதியுள்ள அனைவரும் இலவசமாக விண்ணப்பித்து பலன் பெறலாம்.`;
    return {
      title,
      rightsSummary: rights,
      eligibility,
      subsidiesAndBenefits: subsidies,
      citizenExplainer: spoken,
      officialPortalUrl: portalUrl,
      applicationDeadline: 'தொடர்ந்து செயல்பாட்டில் உள்ளது (Ongoing)'
    };
  }

  // English default
  return {
    title,
    rightsSummary: `All eligible Indian citizens hold direct statutory rights under the ${title} framework without intermediary commission.`,
    eligibility: matched ? matched.eligibility : `Indian resident with Aadhaar-linked bank account, meeting prescribed family income criteria.`,
    subsidiesAndBenefits: matched ? (matched.financial_benefit || matched.benefits) : `Direct Benefit Transfer (DBT) credit or subsidised institutional credit assistance directly disbursed via PFMS.`,
    citizenExplainer: `Namaste. Here is your official policy guide for ${title}. Under this public framework, citizens are entitled to direct welfare benefits without middlemen fees. Ensure your bank account is Aadhaar-seeded to receive direct subsidy transfers.`,
    officialPortalUrl: portalUrl,
    applicationDeadline: 'Active & Ongoing'
  };
}

import { useState, useEffect, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   BUGESERA HARVEST PREDICTION SYSTEM  v4.0
   Author : Cesalie UWIMPUHWE | Rwanda Polytechnic
   Units  : ha input → are sent to model | Result: kg/are
   ═══════════════════════════════════════════════════════════════════════ */

const API_BASE = "http://localhost:5000";

// ── Monthly climate averages ──────────────────────────────────────────────────
const CLIMATE = {
  January:   {temperature:22.4,rainfall:66, humidity:72,sunshine:7.8,windSpeed:11.2,evapotranspiration:108},
  February:  {temperature:22.8,rainfall:72, humidity:73,sunshine:7.6,windSpeed:11.0,evapotranspiration:110},
  March:     {temperature:23.1,rainfall:95, humidity:76,sunshine:7.2,windSpeed:10.8,evapotranspiration:112},
  April:     {temperature:23.5,rainfall:108,humidity:79,sunshine:6.8,windSpeed:10.4,evapotranspiration:106},
  May:       {temperature:23.2,rainfall:78, humidity:77,sunshine:7.0,windSpeed:10.6,evapotranspiration:104},
  June:      {temperature:22.9,rainfall:35, humidity:68,sunshine:8.2,windSpeed:12.1,evapotranspiration:116},
  July:      {temperature:22.5,rainfall:28, humidity:64,sunshine:8.6,windSpeed:12.8,evapotranspiration:120},
  August:    {temperature:23.0,rainfall:42, humidity:66,sunshine:8.4,windSpeed:12.4,evapotranspiration:118},
  September: {temperature:23.6,rainfall:78, humidity:74,sunshine:7.4,windSpeed:11.6,evapotranspiration:114},
  October:   {temperature:23.8,rainfall:110,humidity:80,sunshine:6.6,windSpeed:10.2,evapotranspiration:102},
  November:  {temperature:23.4,rainfall:102,humidity:78,sunshine:7.0,windSpeed:10.6,evapotranspiration:105},
  December:  {temperature:22.6,rainfall:85, humidity:74,sunshine:7.5,windSpeed:11.4,evapotranspiration:109},
};

const MONTHS  = Object.keys(CLIMATE);
const SEASONS = ["Season A","Season B"];
const SECTORS = ["Gashora","Juru","Kamabuye","Mareba","Mayange","Musenyi","Mwogo","Ngeruka","Ntarama","Nyamata","Nyarugenge","Rilima","Ruhuha","Rweru","Shyara"];
const CROPS   = ["Maize","Beans","Rice"];
const SOILS   = ["Clay","Sandy-Clay","Loam"];
const CROP_ICON = {Maize:"/icons/maize.png",Beans:"/icons/beans.png",Rice:"/icons/rice.png"};
const CropIcon = ({name, style={}}) => {
  const icon = CROP_ICON[name] || "bi-flower2";
  if (icon.startsWith('/icons/')) {
    return <img src={icon} alt={name} style={{ width: '1.2em', height: '1.2em', verticalAlign: 'middle', objectFit: 'contain', ...style }} />;
  }
  return <i className={icon} style={style}></i>;
};
const CROP_BENCH = {Maize:23.22,Beans:11.91,Rice:36.36};

// Exact soil type per sector — from Bugesera Soil Analysis dataset
const SECTOR_SOIL_TYPE = {
  Gashora   :"Loam",       // pH 6.5 — Good
  Juru      :"Sandy Loam", // pH 6.9 — Good
  Kamabuye  :"Clay Soil",  // pH 7.1 — Fair
  Mareba    :"Sandy Loam", // pH 7.1 — Good
  Mayange   :"Sandy Loam", // pH 6.0 — Good
  Musenyi   :"Loam",       // pH 7.1 — Good
  Mwogo     :"Sandy Soil", // pH 6.0 — Poor
  Ngeruka   :"Loam",       // pH 7.0 — Good
  Ntarama   :"Sandy Soil", // pH 7.1 — Poor
  Nyamata   :"Clay Soil",  // pH 7.1 — Fair
  Nyarugenge:"Clay Soil",  // pH 6.2 — Fair
  Rilima    :"Sandy Soil", // pH 6.1 — Poor
  Ruhuha    :"Sandy Loam", // pH 7.0 — Good
  Rweru     :"Clay Soil",  // pH 7.0 — Fair
  Shyara    :"Sandy Loam", // pH 6.1 — Good
};

// Soil health + icon mapping
const SOIL_DISPLAY = {
  "Loam"      : {health:"Good", icon:<i className="bi bi-check-circle-fill"></i>, color:"var(--g600)",  bg:"var(--g100)"},
  "Sandy Loam": {health:"Good", icon:<i className="bi bi-check-circle-fill"></i>, color:"var(--g600)",  bg:"var(--g100)"},
  "Clay Soil" : {health:"Fair", icon:<i className="bi bi-exclamation-circle-fill"></i>, color:"var(--s600)",bg:"var(--s100)"},
  "Sandy Soil": {health:"Poor", icon:<i className="bi bi-x-circle-fill"></i>, color:"var(--s500)",  bg:"var(--s100)"},
};

// Season benchmarks per crop (kg/are) — from dataset
const SEASON_BENCH = {
  "Season A": {Maize:23.86, Beans:12.17, Rice:37.96},
  "Season B": {Maize:22.59, Beans:11.65, Rice:34.77},
};

// Yield quality thresholds (percentiles from dataset)
// p25 = Poor, p25-p75 = Average, p75+ = Good, p90+ = Excellent
const YIELD_THRESHOLDS = {
  Maize: {poor:20.54, avg:23.05, good:25.52, excellent:28.0},
  Beans: {poor:10.42, avg:11.90, good:13.51, excellent:15.0},
  Rice : {poor:31.49, avg:35.82, good:40.87, excellent:45.0},
};

// Pest pressure by month — derived from Bugesera dataset rainfall patterns
// High rainfall → higher pest/disease pressure (matches dataset pest records)
const PEST_BY_MONTH = {
  January:"Medium",   // 77mm — moderate risk
  February:"Medium",  // 81mm — moderate risk
  March:"High",       // 142mm — high rainfall = high pest risk
  April:"High",       // 141mm — long rains = high pest risk
  May:"High",         // 146mm — long rains peak = high pest risk
  June:"Low",         // 18mm — dry season = low pest risk
  July:"Low",         // 18mm — dry season = low pest risk
  August:"Low",       // 17mm — dry season = low pest risk
  September:"Medium", // 61mm — short rains starting = medium risk
  October:"Medium",   // 108mm — short rains = medium risk
  November:"High",    // 110mm — short rains peak = high pest risk
  December:"Medium",  // 61mm — tapering rains = medium risk
};

function getClimate(month, season) {
  const b = CLIMATE[month]; if (!b) return null;
  const m = season==="Season A"?{rb:1.05,ta:0.2}:{rb:0.95,ta:-0.1};
  return {temperature:+(b.temperature+m.ta).toFixed(1),rainfall:+(b.rainfall*m.rb).toFixed(1),
          humidity:b.humidity,sunshine:b.sunshine,windSpeed:b.windSpeed,evapotranspiration:b.evapotranspiration};
}

function getSeasonFromMonth(month) {
  const m = MONTHS.indexOf(month)+1;
  return (m>=10||m<=1)?"Season A":"Season B";
}

// ── In-memory user store (fallback when API offline) ─────────────────────────
const DEMO_USERS = {
  "F001":{id:"F001",name:"Cesalie Uwimpuhwe",phone:"+250782001001",sector:"Nyamata",farm_size_ha:0.25,farm_size_are:25,crops:["Maize","Beans"],role:"farmer",password:"harvest2024",email:"cesalie@gmail.com"},
  "F002":{id:"F002",name:"Jean Pierre Habimana",phone:"+250782002002",sector:"Gashora",farm_size_ha:1.8,farm_size_are:180,crops:["Rice"],role:"farmer",password:"harvest2024"},
  "F003":{id:"F003",name:"Vestine Mukamana",phone:"+250782003003",sector:"Juru",farm_size_ha:3.2,farm_size_are:320,crops:["Maize","Rice"],role:"farmer",password:"harvest2024"},
  "A001":{id:"A001",name:"Dr. Pascal Nkurunziza",phone:"+250788100100",sector:"Bugesera",department:"Crop Production",role:"officer",password:"harvest2024"},
  "A100":{id:"A100",name:"District Agri Officer",phone:"+250788000000",sector:"Bugesera",department:"Administration",role:"district",password:"harvest2024"},
  "S001":{id:"S001",name:"Marie Mukaso",phone:"+250788222333",sector:"Nyamata",department:"Extension Services",role:"sector",password:"harvest2024",email:"marie@sector.gov.rw"},
};
let USER_STORE = {...DEMO_USERS};
let nextFNum = 4;

// ── Offline simulation fallback ───────────────────────────────────────────────
function simulateOffline({crop,month,season,farmSizeAre,areaPlantedAre,fertilizer,irrigation,soil}) {
  const BASE = {Maize:23.22,Beans:11.91,Rice:36.36};
  const c = CLIMATE[month]||CLIMATE.October;
  const OPT_T={Maize:23,Beans:22,Rice:25}, OPT_R={Maize:90,Beans:75,Rice:130};
  const tf = Math.exp(-0.5*Math.pow((c.temperature-OPT_T[crop])/2,2));
  const rf = Math.tanh(c.rainfall/OPT_R[crop]);
  const hf = 1-0.003*Math.abs(c.humidity-74);
  const sf = c.sunshine/7.5;
  let y = BASE[crop]*tf*rf*hf*sf;
  if (season==="Season A") y*={Maize:1.12,Beans:1.05,Rice:1.10}[crop];
  if (soil==="Loam") y*=1.05; else if (soil==="Sandy-Clay") y*=0.92;
  if (fertilizer) y*=1.18;
  if (irrigation)  y*=1.10;
  return Math.max(1,Math.round(y*100)/100);
}

function buildRecs(crop, yieldPA, inputs={}) {
  const base       = CROP_BENCH[crop] || 20;
  const pct        = (yieldPA - base) / base * 100;
  const totalKg    = Math.round(yieldPA * (inputs.area_are || 100));
  const fertilizer = inputs.fertilizer;
  const irrigation = inputs.irrigation;
  const soil       = inputs.soil || "Clay";
  const season     = inputs.season || "Season A";
  const month      = inputs.month || "October";
  const pestLevel  = inputs.pest || "Low";
  const prevCrop   = inputs.prevCrop || "Beans";
  const sector     = inputs.sector || "";
  const areaAre    = inputs.area_are || 100;
  const laborAvail = inputs.labor || "Adequate";
  const credit     = inputs.credit || "No";
  const extension  = inputs.extension || "Yes";

  // Harvest timing — days to harvest from planting per crop
  const DAYS = {Maize:90, Beans:75, Rice:120};
  const plantDate = inputs.plantingDate ? new Date(inputs.plantingDate) : new Date();
  const harvestDate = new Date(plantDate);
  harvestDate.setDate(harvestDate.getDate() + (DAYS[crop]||90));
  const harvestStr = harvestDate.toLocaleDateString("en-RW",{day:"numeric",month:"long",year:"numeric"});
  const harvestStr_rw = harvestDate.toLocaleDateString("rw-RW",{day:"numeric",month:"long",year:"numeric"});

  // Estimated revenue (Bugesera avg market prices kg)
  const PRICE = {Maize:300, Beans:600, Rice:500}; // RWF per kg
  const revenue = Math.round(totalKg * (PRICE[crop]||400));
  const revenueStr = revenue.toLocaleString();

  // Next season recommendation
  const NEXT_CROP = {Maize:"Beans", Beans:"Maize", Rice:"Rice"};
  const nextCrop = NEXT_CROP[crop];
  const nextCrop_rw = crop==="Maize"?"Ibigori":crop==="Beans"?"Ibishyimbo":"Umuceri";

  // Fertilizer amount recommendation
  const FERT_REC = {Maize:"DAP 0.5 kg/are at planting + CAN 0.3 kg/are at knee height",
                    Beans:"DAP 0.3 kg/are at planting (avoid excess N)",
                    Rice:"Urea 0.5 kg/are at tillering + DAP 0.4 kg/are at transplanting"};
  const FERT_REC_RW = {Maize:"DAP 0.5 kg/are itewe + CAN 0.3 kg/are igihe ibigori bigeze ku mavi",
                       Beans:"DAP 0.3 kg/are itewe (irinda azote nyinshi)",
                       Rice:"Urea 0.5 kg/are igihe byatangiye gushyira amashami + DAP 0.4 kg/are igihe byimurwa"};

  // Build recs array
  const recs = [];

  // ── 1. YIELD SUMMARY ──
  const seasonBench = (SEASON_BENCH[season]||SEASON_BENCH["Season A"])[crop] || base;
  const thresh      = YIELD_THRESHOLDS[crop] || YIELD_THRESHOLDS.Maize;
  
  let grade, grade_rw, gradeType, gradeMsg, gradeMsg_rw;
  if (yieldPA >= thresh.excellent) {
    grade="Excellent"; grade_rw="Myiza Cyane"; gradeType="success";
    gradeMsg=`Your yield of ${yieldPA} kg/are is in the TOP 10% of ${crop} farmers in Bugesera this ${season}. Outstanding!`;
    gradeMsg_rw=`Umusaruro wawe wa ${yieldPA} kg/are uri muri 10% by'imbere ku bahinzi ba ${crop} muri Bugesera uyu ${season}. Byiza cyane!`;
  } else if (yieldPA >= thresh.good) {
    grade="Good"; grade_rw="Myiza"; gradeType="success";
    gradeMsg=`Your yield of ${yieldPA} kg/are is ABOVE AVERAGE for ${crop} in ${season}. Better than 75% of farmers.`;
    gradeMsg_rw=`Umusaruro wawe wa ${yieldPA} kg/are uri HEJURU Y'IMPUZANDENGO kuri ${crop} uyu ${season}. Urusha 75% by'abahinzi.`;
  } else if (yieldPA >= thresh.avg) {
    grade="Average"; grade_rw="Igiranye n'Impuzandengo"; gradeType="info";
    gradeMsg=`Your yield of ${yieldPA} kg/are is at the DISTRICT AVERAGE for ${crop} in ${season} (${seasonBench.toFixed(1)} kg/are).`;
    gradeMsg_rw=`Umusaruro wawe wa ${yieldPA} kg/are uri KURI MPUZANDENGO y'akarere kuri ${crop} uyu ${season} (${seasonBench.toFixed(1)} kg/are).`;
  } else {
    grade="Below Average"; grade_rw="Iri Munsi y'Impuzandengo"; gradeType="warning";
    gradeMsg=`Your yield of ${yieldPA} kg/are is BELOW the ${season} average of ${seasonBench.toFixed(1)} kg/are.`;
    gradeMsg_rw=`Umusaruro wawe wa ${yieldPA} kg/are uri MUNSI YA MPUZANDENGO ya ${season} yo kuri ${seasonBench.toFixed(1)} kg/are.`;
  }

  recs.push({
    type:gradeType, 
    icon: gradeType==="success"?"bi-trophy":"bi-bar-chart-line",
    category:`${grade} Harvest / Isarura ${grade_rw} — ${season}`,
    message: gradeMsg,
    message_rw: gradeMsg_rw,
    goal: "Evaluates your performance against district benchmarks.",
    goal_rw: "Gupima umusaruro wawe ugereranyije n'impuzandengo y'akarere."
  });

  // ── 2. HARVEST DATE ──
  recs.push({
    type:"info", 
    icon: "bi-calendar-event",
    category:"Estimated Harvest Date / Itariki yo Gusarura",
    message:`Based on your planting date, your ${crop} should be ready around ${harvestStr} (${DAYS[crop]||90} days).`,
    message_rw:`Ugereranyije n'itariki wateyeho, ${crop} yawe izaba yejeje hafi ya ${harvestStr_rw} (iminsi ${DAYS[crop]||90}).`,
    goal: "Helps you plan labor and tools for harvest time.",
    goal_rw: "Gugufasha guteganya abakozi n'ibikoresho igihe cy'isarura kimaze kuregera."
  });

  // ── 3. FERTILIZER ──
  if (!fertilizer) {
    recs.push({
      type:"warning", 
      icon: "bi-exclamation-octagon",
      category:"Fertilizer Not Applied / Nta Fumbire Yakoreshejwe",
      message:`You did not apply fertilizer. Applying ${FERT_REC[crop]} next season could increase yield by 15–25%.`,
      message_rw:`Ntagufumbire mwakoresheje. Gukoresha ${FERT_REC_RW[crop]} igihe kizaza byongera umusaruro ku kigero cya 15-25%.`,
      goal: "Explains the yield-boosting potential of correct fertilizer application.",
      goal_rw: "Gusobanura akamaro k'ifumbire mu kongera umusaruro."
    });
  } else {
    recs.push({
      type:"success", 
      icon: "bi-check-circle",
      category:"Fertilizer Applied / Ifumbire Yakoreshejwe",
      message:`Good — fertilizer was applied. For ${crop}, the optimal rate is ${FERT_REC[crop]}.`,
      message_rw:`Byiza — mwakoresheje ifumbire. Kuri ${crop}, uburyo bwiza ni ${FERT_REC_RW[crop]}.`,
      goal: "Confirms correct input use and guides on optimal dosages.",
      goal_rw: "Kwemeza ikoreshwa ryiza ry'ifumbire no gutanga inama ku kigero gikwiye."
    });
  }

  // ── 4. IRRIGATION ──
  if (!irrigation && (month==="June"||month==="July"||month==="August")) {
    recs.push({
      type:"warning", 
      icon: "bi-droplet-half",
      category:"Irrigation Needed / Kuhira Birakenewe",
      message:`You planted in ${month} (dry season). Without irrigation, ${crop} faces moisture stress. Apply 4–6cm water per week.`,
      message_rw:`Mwateye mu kwezi kwa ${month} (igihe cy'izuba). Ntagukuhira, ${crop} izahura n'ikibazo cy'amazi. Kuhira 4-6cm buri cyumweru.`,
      goal: "Prevents crop death during dry months through irrigation advice.",
      goal_rw: "Kukumira ko imyaka yumira mu gihe cy'izuba binyuze mu kuhira."
    });
  } else if (!irrigation) {
    recs.push({
      type:"info", 
      icon: "bi-droplet",
      category:"Irrigation Status / Imiterere yo Kuhira",
      message:`You are relying on rainfall. If rain is insufficient during flowering, supplemental watering can recover 20% yield.`,
      message_rw:`Muri gutegereza imvura gusa. Imvura yaba nke igihe cy'uburabyo, kuhira inshuro imwe byagarura 20% by'umusaruro.`,
      goal: "Suggests risk mitigation when rainfall is the only water source.",
      goal_rw: "Gutanga inama zo kugabanya ibyago mu gihe imvura yabaye nke."
    });
  }

  // ── 5. PEST PRESSURE ──
  const pIcon = pestLevel==="High"?"bi-bug-fill":"bi-bug";
  if (pestLevel === "High") {
    recs.push({
      type:"warning", 
      icon: pIcon,
      category:`High Pest Risk — ${month} / Ibyago by'Udukoko — ${month}`,
      message:`${month} has high pest pressure. Scout your ${crop} field every 5 days. Watch for pests and apply neem oil.`,
      message_rw:`Mu kwezi kwa ${month} haba udukoko twinshi. Genya umurima wawe wa ${crop} buri minsi 5. Reba udukoko kandi ukoreshe neem oil.`,
      goal: "Reduces crop loss by encouraging frequent pest monitoring.",
      goal_rw: "Kugabanya igihombo binyuze mu kugenzura udukoko kenshi."
    });
  }

  // ── 6. SOIL ──
  recs.push({
    type: soil==="Loam"?"success":"info", 
    icon: "bi-flower2",
    category:`Soil Quality — ${soil} / Imiterere y'Ubutaka — ${soil}`,
    message: soil==="Loam"?`Loam soil is ideal for ${crop}. Maintain organic matter.`:`Add 20-30 kg/are of compost to improve ${soil} fertility next season.`,
    message_rw: soil==="Loam"?`Ubutaka bwa Loam ni bwiza kuri ${crop}. Komeza gushyiramo ifumbire y'imborera.`:`Ongeramo 20-30 kg/are za kompositi kugira ngo wongere uburyohe bw'ubutaka bwa ${soil} igihe kizaza.`,
    goal: "Provides long-term soil health management advice.",
    goal_rw: "Gutanga inama zo gukurikirana ubutaka mu buryo burambye."
  });

  // ── 7. STORAGE & MARKET ──
  recs.push({
    type:"info", 
    icon: "bi-box-seam",
    category:"Storage & Market / Ububiko n'Isoko",
    message:`Dry grain below 13% moisture. Expected revenue: RWF ${revenueStr} from ${totalKg} kg.`,
    message_rw:`Yubika imyaka munsi ya 13% y'ubumidure. Inyungu iteganyijwe: RWF ${revenueStr} kuri ${totalKg} kg.`,
    goal: "Optimizes financial return and prevents post-harvest loss.",
    goal_rw: "Kugabanya igihombo nyuma yo gusarura no kongera inyungu."
  });

  return recs;
}


const SmsNotification = ({ sms, onClear }) => {
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (sms) {
      const t1 = setTimeout(() => setClosing(true), 6000);
      const t2 = setTimeout(onClear, 6700);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [sms, onClear]);
  if (!sms) return null;
  const handleDismiss = () => {
    setClosing(true);
    setTimeout(onClear, 300);
  };

  return (
    <div className="sms-overlay">
      <div className={`sms-card ${closing ? "hide" : ""}`}>
        <div className="sms-icon-bx"><i className="bi bi-chat-dots"></i></div>
        <div className="sms-content" onClick={handleDismiss}>
          <div className="sms-header">
            <span className="sms-app">Messages</span>
            <span className="sms-time">Now</span>
          </div>
          <div className="sms-sender">Bugesera Harvest System</div>
          <div className="sms-body">
            Success! Your account is ready. Your ID is <strong>{sms.nid}</strong>. Welcome to smart farming!
          </div>
          <div className="sms-actions" style={{marginTop:8, borderTop:"1px solid #eee", paddingTop:8, textAlign:"right"}}>
            <button onClick={(e)=>{e.stopPropagation(); handleDismiss();}} 
              style={{background:"none", border:"none", color:"#007AFF", fontWeight:600, fontSize:13, cursor:"pointer"}}>
              No thanks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Translations ──────────────────────────────────────────────────────────────
const T = {
  en: {
    appName:"Harvest Predictor",appSub:"Bugesera District · Rwanda · Smart Farming",
    login:"Login",register:"Farmer Registration",logout:"Logout",
    farmer:"Farmer",officer:"Agri Officer",
    phone:"Phone / Farmer ID",phoneReg:"Phone Number",password:"Password",confirmPw:"Confirm Password",
    fullName:"Full Name",sector:"Sector",
    farmSizeHa:"Farm Size (ha)",
    areaPlantedHa:"Area Planted (ha) *",
    plantingDate:"Planting Date *",
    signingIn:"Signing in…",creatingAccount:"Creating account…",
    loginBtn:"→ Login",registerBtn:"Register as Farmer",
    alreadyHave:"Already have an account?",noAccount:"Don't have an account?",
    signInHere:"Sign in",createHere:"Create one",
    demoTitle:"Demo Credentials (click to fill)",
    forgotPw:"Forgot Password?",forgotTitle:"Reset Password",
    forgotSub:"Enter your registered Email, Phone, or ID to reset your password",
    newPwLabel:"New Password",confirmNewPw:"Confirm New Password",
    resetBtn:"Reset Password",resetSuccess:"Password reset successfully!",
    backToLogin:"← Back to Login",userNotFound:"No account found with that email, phone, or ID.",
    resetDone:"Password updated! You can now login.",
    invalidCreds:"Invalid credentials.",pwMismatch:"Passwords do not match.",
    allRequired:"Please fill all required fields.",phoneTaken:"Phone already registered.",
    notValidPhone:"Phone number is not valid (10 digits required)",
    invalidRwPhone:"Only Rwandan MTN or Airtel numbers are allowed (078... or 072...)",
    welcome:"Welcome",farmerId:"Farmer ID",
    predictions:"Predictions",accuracy:"Accuracy",
    farmSummary:"Your Farm Summary",totalFarmSize:"Total Farm Size",
    activeCrops:"Active Crops",predictionsMade:"Predictions Made",
    recentPredictions:"Recent Predictions",
    home:"Home",predict:"Predict",history:"History",tips:"Tips",
    newPred:"New Prediction",stepOf:"Step",
    enterFarmDetails:"Enter Your Farm Details",cropLocation:"Crop & Location",
    selectCrop:"1. Select Crop Type *",
    districtSector:"District/Sector *",
    season:"Season *",month:"Month (auto)",soilType:"Soil Type",
    farmerCategory:"Farmer Category",
    fertilizerUsed:"Fertilizer Used?",irrigationUsed:"Irrigation Used?",
    yes:(<><i className="bi bi-check-circle"></i> Yes</>),no:(<><i className="bi bi-x-circle"></i> No</>),continueStep2:"Continue to Step 2 →",
    requiredFields:"* Required fields",
    reviewPredict:"Review & Predict",summary:"Summary",edit:(<><i className="bi bi-pencil"></i> Edit</>),
    cropType:"Crop Type",location:"Location",fertilizer:"Fertilizer",irrigation:"Irrigation",
    autoClimateTitle:"Auto-Detected Climate",autoClimateNote:"Based on Bugesera historical averages",
    saveFarm:(<><i className="bi bi-floppy"></i> Save for future use</>),
    getHarvestPrediction:(<><i className="bi bi-tree"></i> Get Harvest Prediction</>),runningModel:"Running AI Model…",
    expectedHarvest:"EXPECTED HARVEST",predictionComplete:(<><i className="bi bi-check-circle"></i> Prediction Complete!</>),
    perAreEst:"per are (a) estimated",total:"Total",confidence:"Confidence",modelUsed:"Model",
    comparison:"Comparison",avgYieldArea:"District average:",yourPrediction:"Your prediction:",
    recommendations:"Recommendations",makeAnother:(<><i className="bi bi-arrow-repeat"></i> New Prediction</>),
    predHistory:"Prediction History",searchCrop:"Search by crop or sector…",
    allCrops:"All Crops",overallStats:"Overall Statistics",
    avgAccuracy:"Avg Accuracy",totalPredictions:"Total",
    completed:"Completed",growing:"Growing",successRate:"Success Rate",
    predicted:"Predicted:",total2:"Total:",viewDetails:"View Details →",
    weatherTitle:"Weather Info",currentSeason:"Current Season",
    monthlyRainfall:"Monthly Rainfall (mm)",monthlyTemp:"Monthly Temperature (°C)",
    plantingCalendar:"Bugesera Planting Calendar",
    tipsTitle:"Tips & Advice",tipsSubtitle:"Expert farming guidance",
    tailoredTips:"Tailored for Bugesera District smallholder farmers",
    myProfile:"My Profile",personalInfo:"Personal Information",
    name:"Name",id:"ID",phoneLabel:"Phone",emailLabel:"Email",settings:"Settings",
    editProfile:"Edit Profile",changePassword:"Change Password",
    language:"Language",aboutApp:"About App",
    districtDash:"District Level Dashboard",officerView:"District Administration — Bugesera",
    overview:(<><i className="bi bi-bar-chart-line"></i> Overview</>),
    sectorsTab:(<><i className="bi bi-geo-alt"></i> Sectors</>),
    farmersTab:(<><i className="bi bi-person"></i> Farmers</>),
    reportsTab:(<><i className="bi bi-file-earmark-text"></i> Reports</>),
    districtYield:"District Yield by Crop (kg/are avg)",
    seasonPerf:"Season Performance",districtAlerts:"Notifications",
    sectorYield:"Predicted Yield by Sector",sectorRisk:"Sector Risk Assessment",
    searchFarmers:"Search farmers…",farmerStats:"Farmer Statistics",
    generateReport:"Generate District Report",generatePDF:(<><i className="bi bi-download"></i> Generate PDF</>),
    sendAdvice:"Send Advice to Farmers",targetGroup:"Target Group",
    adviceMessage:"Advice Message",sendToFarmers:(<><i className="bi bi-megaphone"></i> Send</>),
    temperature:"Temperature",rainfall:"Rainfall",humidity:"Humidity",sunshine:"Sunshine",
    selectLocation:"Select location…",selectSeason:"Select season…",selectMonth:"Select month…",
    selectMonthFirst:"← Select planting date to load climate",
    offlineMode:(<><i className="bi bi-exclamation-triangle"></i> Offline mode — using local simulation</>),
    soilInfo:"Soil Info",
    emailGmailRequired:"Farmer registration requires a valid Gmail account (ending in @gmail.com) to receive your password.",
    agreeTerms: "I agree to the Terms and Conditions and Data Privacy policy.",
    mustAgree: "Please agree to the Terms and Conditions to proceed.",
    invalidEmail: "Invalid email format. Please use a real email address (e.g., user@example.com).",
    noCapsEmail: "Email cannot contain capital letters. Please use small letters and numbers.",
    registerTab: "Register",
    registerOfficer: "Register New Agri Officer",
    officerRole: "Officer Role",
    assignedSector: "Assigned Sector",
    existingOfficers: "Existing Officers",
    deptLabel: "Department",
    officerRegistered: "Officer registered! Password sent to email.",
  },
  rw: {
    appName:"Gusesengura Imyaka",appSub:"Akarere ka Bugesera · Rwanda · Ubuhinzi Bw'Ikoranabuhanga",
    login:"Injira",register:"Kwiyandikisha nk'Umuhinzi",logout:"Sohoka",
    farmer:"Umuhinzi",officer:"Ofisiye w'Ubuhinzi",
    phone:"Telefone / ID",phoneReg:"Telefone",password:"Ijambo ry'Ibanga",confirmPw:"Emeza Ijambo ry'Ibanga",
    fullName:"Amazina Yose",sector:"Segiteri",
    farmSizeHa:"Ubuso bw'Akarima (ha)",
    areaPlantedHa:"Akarima Gatewe (ha) *",
    plantingDate:"Itariki yo Gutera *",
    signingIn:"Injira…",creatingAccount:"Fungura konti…",
    loginBtn:"→ Injira",registerBtn:"Iyandikishe nk'Umuhinzi",
    alreadyHave:"Usanzwe ufite konti?",noAccount:"Nta konti ufite?",
    signInHere:"Injira hano",createHere:"Fungura hano",
    demoTitle:"Amakuru yo Gerageza",
    forgotPw:"Wibagiwe Ijambo ry'Ibanga?",forgotTitle:"Hindura Ijambo ry'Ibanga",
    forgotSub:"Injiza email, telefone, cyangwa ID yawe kugirango uhindure ijambo ry'ibanga",
    newPwLabel:"Ijambo ry'Ibanga Rishya",confirmNewPw:"Emeza Ijambo ry'Ibanga Rishya",
    resetBtn:"Hindura",resetSuccess:"Byahinduwe neza!",
    backToLogin:"← Garuka ku kwinjira",userNotFound:"Nta konti iboneka kuri iyo email, nimero, cyangwa ID.",
    resetDone:"Ijambo ry'ibanga ryahinduwe! Injira ubu.",
    invalidCreds:"Amakuru atari yo.",pwMismatch:"Amagambo ntahura.",
    allRequired:"Uzuza ibisabwa.",phoneTaken:"Iyo nimero isanzwe iyanditswe.",
    notValidPhone:"Nimero ya telefone ntayo (igomba kuba imvure 10)",
    invalidRwPhone:"Nimero ya telefone yemewe ni iy'u Rwanda gusa (MTN cyangwa Airtel)",
    welcome:"Murakaza Neza",farmerId:"ID y'Umuhinzi",
    predictions:"Ibisobanuro",accuracy:"Ikarita",
    farmSummary:"Incamake y'Akarima",totalFarmSize:"Ubuso bwose",
    activeCrops:"Ibihingwa",predictionsMade:"Ibisobanuro Byakozwe",
    recentPredictions:"Ibisobanuro bya Vuba",
    home:"Ahabanza",predict:"Sobanura",history:"Amateka",tips:"Inama",
    newPred:"Gusobanura Bishya",stepOf:"Intambwe",
    enterFarmDetails:"Injiza Amakuru y'Akarima",cropLocation:"Igihingwa n'Aho Biherereye",
    selectCrop:"1. Hitamo Igihingwa *",
    districtSector:"Akarere/Segiteri *",
    season:"Igihe cy'Ihinga *",month:"Ukwezi (bwite)",soilType:"Ubwoko bw'Ubutaka",
    farmerCategory:"Icyiciro cy'Umuhinzi",
    fertilizerUsed:"Mwakokesheje Ifumbire?",irrigationUsed:"Mwakoresheje Kuhira?",
    yes:(<><i className="bi bi-check-circle"></i> Yego</>),no:(<><i className="bi bi-x-circle"></i> Oya</>),continueStep2:"Komeza ku Ntambwe ya 2 →",
    requiredFields:"* Birasabwa",
    reviewPredict:"Reba Hanyuma Usobanure",summary:"Incamake",edit:(<><i className="bi bi-pencil"></i> Hindura</>),
    cropType:"Igihingwa",location:"Aho Biherereye",fertilizer:"Ifumbire",irrigation:"Kuhira",
    autoClimateTitle:"Amakuru y'Ibihe Bwite",autoClimateNote:"Bikoreshwa muri Bugesera",
    saveFarm:(<><i className="bi bi-floppy"></i> Bika Akarima</>),
    getHarvestPrediction:(<><i className="bi bi-tree"></i> Bona Ibisobanuro by'Imyaka</>),runningModel:"Koresha Modeli…",
    expectedHarvest:"IMYAKA ITEGANYIJWE",predictionComplete:(<><i className="bi bi-check-circle"></i> Birakozwe!</>),
    perAreEst:"kuri are imwe biteganyijwe",total:"Igiteganyo",confidence:"Inyemeza",modelUsed:"Modeli",
    comparison:"Igereranya",avgYieldArea:"Hagati ya zone:",yourPrediction:"Ibisobanuro byawe:",
    recommendations:"Inama",makeAnother:(<><i className="bi bi-arrow-repeat"></i> Sobanura Ukundi</>),
    predHistory:"Amateka y'Ibisobanuro",searchCrop:"Shakisha…",
    allCrops:"Ibihingwa Byose",overallStats:"Ibarurishamibare",
    avgAccuracy:"Ikarita Hagati",totalPredictions:"Byose",
    completed:"Byarangiye",growing:"Birakura",successRate:"Intsinzi",
    predicted:"Byateganyijwe:",total2:"Byose:",viewDetails:"Reba →",
    weatherTitle:"Amakuru y'Ibihe",currentSeason:"Igihe cy'Ubu",
    monthlyRainfall:"Imvura buri kwezi (mm)",monthlyTemp:"Ubushyuhe (°C)",
    plantingCalendar:"Gahunda yo Gutera muri Bugesera",
    tipsTitle:"Inama n'Ubujyanama",tipsSubtitle:"Ubuyobozi bw'inzobere",
    tailoredTips:"Bigenewe abahinzi bato ba Bugesera",
    myProfile:"Umwirondoro Wanjye",personalInfo:"Amakuru Bwite",
    name:"Amazina",id:"Indangamuntu",phoneLabel:"Telefone",emailLabel:"Email",settings:"Igenamiterere",
    editProfile:"Hindura Umwirondoro",changePassword:"Hindura Ijambo ry'Ibanga",
    language:"Ururimi",aboutApp:"Ibyerekeye App",
    districtDash:"Ikibaho cy'Ubuhinzi",officerView:"Akarere ka Bugesera — Ofisiye",
    overview:(<><i className="bi bi-bar-chart-line"></i> Incamake</>),
    sectorsTab:(<><i className="bi bi-geo-alt"></i> Inzego</>),
    farmersTab:(<><i className="bi bi-people"></i> Farmers</>),
    reportsTab:(<><i className="bi bi-file-earmark-text"></i> Reports</>),
    districtYield:"Umusaruro w'Akarere (kg/are)",
    seasonPerf:"Imikorere y'Ibihe",districtAlerts:"Ubutumwa",
    sectorYield:"Umusaruro kuri Segiteri",sectorRisk:"Ingorane kuri Segiteri",
    searchFarmers:"Shakisha abahinzi…",farmerStats:"Ibarurishamibare",
    generateReport:"Kora Raporo",generatePDF:(<><i className="bi bi-download"></i> Kora PDF</>),
    sendAdvice:"Ohereza Inama",targetGroup:"Ishyirahamwe",
    adviceMessage:"Ubutumwa",sendToFarmers:(<><i className="bi bi-megaphone"></i> Ohereza</>),
    temperature:"Ubushyuhe",rainfall:"Imvura",humidity:"Ubuhehere",sunshine:"Izuba",
    selectLocation:"Hitamo aho biherereye…",selectSeason:"Hitamo igihe…",selectMonth:"Hitamo ukwezi…",
    selectMonthFirst:"← Injiza itariki yo gutera",
    offlineMode:(<><i className="bi bi-exclamation-triangle"></i> Offline — gukoresha simulation</>),
    soilInfo:"Amakuru y'Ubutaka",
    emailGmailRequired:"Kwiyandikisha nk'umuhinzi bisaba konti ya Gmail (irangira na @gmail.com) kugira ngo uone ijambo ry'ibanga ryawe.",
    agreeTerms: "Nemeye Amategeko n'Amabwiriza agenga iyi sisitemu.",
    mustAgree: "Wibagiwe kwemera amategeko n'amabwiriza.",
    invalidEmail: "Email wanditse ntabwo yujuje ibisabwa.",
    noCapsEmail: "Email ntigomba kuba irimo inyuguti nkuru. Koresha inyuguti nto n'imibare gusa.",
    registerTab: "Iyandikishe",
    registerOfficer: "Iyandikishe Ofisiye Mushya",
    officerRole: "Inshingano za Ofisiye",
    assignedSector: "Segiteri yashyizwemo",
    existingOfficers: "Abakozi Basanzwe",
    deptLabel: "Ishami",
    officerRegistered: "Ofisiye yanditswe! Ijambo ry'ibanga ryoherejwe kuri email.",
  }
};


// ── Sub-components ────────────────────────────────────────────────────────────
function LangBtn({lang,setLang}) {
  return (
    <button className="lang-sw" onClick={()=>setLang(l=>l==="en"?"rw":"en")}>
      <span>{lang==="en"?"EN":"RW"}</span>
      <span>{lang==="en"?"Kinyarwanda":"English"}</span>
    </button>
  );
}

function Topbar({title,sub,onBack,actions,lang,setLang}) {
  return (
    <div className="topbar">
      <div className="topbar-inner" style={{maxWidth:850, margin:"0 auto", width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <div className="back-row">
          {onBack && <button className="back-icon" onClick={onBack}>←</button>}
          <div>
            <div className="topbar-brand">{title}</div>
            {sub && <div className="topbar-sub">{sub}</div>}
          </div>
        </div>
        <div className="topbar-actions">
          <LangBtn lang={lang} setLang={setLang}/>{actions}
        </div>
      </div>
    </div>
  );
}

function Sidebar({current,onNavigate,user,onLogout,lang,setLang}) {
  const t = T[lang];
  const navItems = [
    [(<i className="bi bi-house"></i>),t.home,"dashboard"],
    [(<i className="bi bi-tree"></i>),t.predict,"predict"],
    [(<i className="bi bi-bar-chart-line"></i>),t.history,"history"],
    [(<i className="bi bi-cloud-sun"></i>),t.weatherTitle||"Weather","weather"],
    [(<i className="bi bi-book"></i>),t.tipsTitle||"Tips","tips"],
    [(<i className="bi bi-bell"></i>),t.districtAlerts||"Alerts","notifications"],
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🌾</div>
        <div className="sidebar-logo-name">{lang==="en"?"Farmer DashBoard":t.appName}</div>
        <div className="sidebar-logo-sub">Bugesera · Rwanda</div>
      </div>
      <nav className="sidebar-nav">
        <div className="sn-section">Navigation</div>
        {navItems.map(([icon,label,sc])=>(
          <button key={sc} className={`sn-item ${current===sc?"act":""}`} onClick={()=>onNavigate(sc)}>
            <span className="sn-icon">{icon}</span>
            <span className="sn-label">{label}</span>
            {current===sc && <span className="sn-badge">●</span>}
          </button>
        ))}
        <div className="sn-section" style={{marginTop:8}}>Account</div>
        <button className="sn-item" onClick={()=>onNavigate("profile")}>
          <span className="sn-icon"><i className="bi bi-person"></i></span>
          <span className="sn-label">{t.myProfile||"Profile"}</span>
        </button>
        <button className="sn-item" onClick={()=>setLang(l=>l==="en"?"rw":"en")}>
          <span className="sn-icon">{lang==="en"?"EN":"RW"}</span>
          <span className="sn-label">{lang==="en"?"Kinyarwanda":"English"}</span>
        </button>
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={onLogout} title={t.logout}>
          <div className="sidebar-avatar"><i className="bi bi-person"></i>‍<i className="bi bi-tree"></i></div>
          <div style={{flex:1,minWidth:0}}>
            <div className="sidebar-user-name">{user?.name||"User"}</div>
            <div className="sidebar-user-role"><i className="bi bi-box-arrow-right"></i> {t.logout}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function BottomNav({current,onNavigate,lang,user}) {
  const t = T[lang];
  let items = [];
  
  if (user?.role === "farmer") {
    items = [
      {id:"dashboard", icon:(<i className="bi bi-house"></i>), label:t.home},
      {id:"predict",   icon:(<i className="bi bi-tree"></i>), label:t.predict},
      {id:"history",   icon:(<i className="bi bi-bar-chart-line"></i>), label:t.history},
      {id:"weather",   icon:(<i className="bi bi-cloud-sun"></i>), label:t.weatherTitle||"Weather"},
      {id:"tips",      icon:(<i className="bi bi-book"></i>), label:t.tipsTitle||"Tips"},
    ];
  } else {
    // Officer / District / Sector roles
    items = [
      {id:"overview", icon:(<i className="bi bi-bar-chart-line"></i>), label:t.overviewTab||"Overview"},
      {id:"sectors",  icon:(<i className="bi bi-geo-alt"></i>), label:t.sectorsTab||"Sectors"},
      {id:"reports",  icon:(<i className="bi bi-file-earmark-text"></i>), label:t.reportsTab||"Reports"},
    ];
    if (user?.role === "district") {
      items.push({id:"admin", icon:(<i className="bi bi-person-plus"></i>), label:t.registerTab||"Admin"});
    }
  }

  return (
    <nav className="bottom-nav">
      {items.map(it=>(
        <button key={it.id} className={`bn-item ${current===it.id?"act":""}`} onClick={()=>onNavigate(it.id)}>
          <span className="bn-icon">{it.icon}</span>
          <span className="bn-label">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

function ClimateCard({climate,month,season,lang}) {
  const t = T[lang];
  if (!climate) return (
    <div className="climate-pending">
      <div style={{fontSize:28,marginBottom:6}}><i className="bi bi-cloud-sun"></i></div>
      <div style={{fontWeight:700,marginBottom:3}}>{t.autoClimateTitle}</div>
      <div style={{fontSize:12,opacity:.8}}>{t.selectMonthFirst}</div>
    </div>
  );
  return (
    <div className="climate-card">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div className="climate-badge"><i className="bi bi-robot"></i> {t.autoClimateTitle}</div>
          <div style={{fontWeight:800,fontSize:15,marginBottom:2}}>{month} · {season}</div>
          <div style={{fontSize:11,opacity:.75}}>{t.autoClimateNote}</div>
        </div>
        <div style={{fontSize:32,opacity:.9}}><i className="bi bi-cloud-sun"></i></div>
      </div>
      <div className="climate-grid">
        {[
          [climate.temperature+"°C",(<><i className="bi bi-thermometer-half"></i> Temp</>)],
          [climate.rainfall+"mm",(<><i className="bi bi-cloud-rain"></i> Rain</>)],
          [climate.humidity+"%",(<><i className="bi bi-droplet"></i> Humid</>)],
          [climate.sunshine+"h",(<><i className="bi bi-sun"></i> Sun</>)],
          [climate.windSpeed,(<><i className="bi bi-wind"></i> Wind km/h</>)],
          [climate.evapotranspiration,(<><i className="bi bi-cloud-haze2"></i> ET mm</>)],
        ].map(([val,lbl])=>(
          <div key={lbl} className="climate-item">
            <div className="climate-val">{val}</div>
            <div className="climate-lbl">{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function AuthScreen({onLogin,lang,setLang,setSms,addNotif}) {
  const t = T[lang];
  const [mode,setMode]       = useState("login"); // login | register | forgot
  const [role,setRole]       = useState("farmer"); // Only used for registration now
  const [email,setEmail]     = useState("");
  const [pw,setPw]           = useState("");
  const [name,setName]       = useState("");
  const [sector,setSector]   = useState("");
  const [farmHa,setFarmHa]   = useState("");
  const [dept,setDept]       = useState("");
  const [showPw,setShowPw]   = useState(false);
  const [loading,setLoading] = useState(false);
  const [error,setError]     = useState("");
  const [success,setSuccess] = useState("");
  const [resetEmail,setResetEmail] = useState("");
  const [newPw,setNewPw]       = useState("");
  const [confPw,setConfPw]     = useState("");
  const [generatedPw,setGeneratedPw] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const reset = ()=>{ setEmail("");setPw("");setName("");setSector("");setFarmHa("");setError("");setSuccess("");setGeneratedPw(""); setAgreedTerms(false); };

  const handleForgotPassword = async ()=>{
    setError(""); setSuccess("");
    if (!resetEmail.trim()) { setError(t.allRequired); return; }
    if (!newPw)             { setError(t.allRequired); return; }
    if (newPw !== confPw)   { setError(t.pwMismatch);  return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reset-password`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({identifier: resetEmail.trim(), new_password: newPw, role})
      });
      const data = await res.json();
      if (data.success) {
        setLoading(false); setSuccess(t.resetDone);
        setTimeout(()=>{ setMode("login"); setResetEmail(""); setNewPw(""); setConfPw(""); setSuccess(""); }, 2000);
        return;
      }
    } catch(_) {}
    setLoading(false);
    setError(t.userNotFound);
  };

  const handleLogin = async ()=>{
    if (email.trim().toLowerCase().includes("@") && !email.trim().toLowerCase().endsWith("@gmail.com") && !email.trim().toLowerCase().endsWith(".gov.rw")) {
      setError("Farmer accounts must use a @gmail.com email address.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/login`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email:email.trim().toLowerCase(),password:pw})
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) { onLogin(data.user); return; }
      else { setError(data.error || t.invalidCreds); }
    } catch(_) {
      setLoading(false);
      setError("Unable to connect to server");
    }
  };

  const handleRegister = async ()=>{
    setError(""); setSuccess("");
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) { setError(t.invalidEmail); return; }
    if (/[A-Z]/.test(email.trim())) { setError(t.noCapsEmail); return; }
    if (!email.trim().toLowerCase().endsWith("@gmail.com")) {
      setError(t.emailGmailRequired);
      return;
    }
    if (!agreedTerms) {
      setError(t.mustAgree);
      return;
    }
    
    if (!name||!email){setError(t.allRequired);return;}
    
    setLoading(true);
    try {
      const regData = {
        name, email: email.trim().toLowerCase(), role: "farmer",
        sector: sector,
        farm_size_ha: (parseFloat(farmHa)||0),
        department: ""
      };
      
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regData)
      });
      
      const data = await res.json();
      setLoading(false);
      
      if (data.success) {
        const nu = data.user;
        setGeneratedPw(data.generated_password);
        setSuccess(`Account created! Your auto-generated password is: ${data.generated_password}. Please copy it before logging in.`);
        return;
      } else {
        setError(data.error || "Registration failed.");
        return;
      }
    } catch (e) {
      setLoading(false);
      setError("Server connection failed.");
      console.log("Registration API error:", e);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-left-logo">🌾</div>
        <div className="auth-left-title">{t.appName}</div>
        <div className="auth-left-sub">{t.appSub}</div>
        <div className="auth-left-stats">
          {[["15", lang==="rw"?"Segiteri":"Sectors"],["3", lang==="rw"?"Ibihingwa":"Crops"]].map(([v,l])=>(
            <div key={l} className="auth-left-stat">
              <div className="auth-left-stat-val">{v}</div>
              <div className="auth-left-stat-lbl">{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          <div className="lang-bar">
            {["en","rw"].map(l=>(
              <button key={l} className={`lang-pill ${lang===l?"act":""}`} onClick={()=>setLang(l)}>
                {l==="en"?<><span></span> English</>:<><span></span> Kinyarwanda</>}
              </button>
            ))}
          </div>
          <div className="auth-logo">🌾</div>
          <div className="auth-header">
            <h2>{t.appName}</h2>
            <p className="auth-sub-txt">{t.appSub}</p>
          </div>
          
          {/* Public registration is for Farmers only. Officers are registered by the District Admin. */}

          {error   && <div className="alert alert-err" style={{fontSize:13, padding:"10px", marginBottom:"16px", borderRadius:"6px"}}><i className="bi bi-exclamation-triangle"></i> {error}</div>}
          {success && <div className="alert alert-ok" style={{fontSize:13, padding:"10px", marginBottom:"16px", borderRadius:"6px", userSelect:"text"}}><i className="bi bi-check-circle"></i> {success}</div>}

          {mode==="login" && (
            <>
              <div style={{textAlign:"center", marginBottom:16}}>
                <div style={{fontSize:18, fontWeight:800, color:"var(--g900)"}}>{t.login}</div>
              </div>
              <div className="fgrp">
                <label className="flabel"><i className="bi bi-envelope"></i> Email Address</label>
                <input className="academic-input" type="email" placeholder="e.g. user@example.com"
                  value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
              </div>
              <div className="fgrp" style={{position:"relative"}}>
                <label className="flabel"><i className="bi bi-lock"></i> {t.password}</label>
                <input className="academic-input" type={showPw?"text":"password"} placeholder={t.password}
                  value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                  style={{paddingRight:46}}/>
                <button onClick={()=>setShowPw(!showPw)} className="pw-toggle" style={{fontSize:16, top:36, textTransform:"none"}}>
                  {showPw?(<i className="bi bi-eye-slash"></i>):(<i className="bi bi-eye"></i>)}
                </button>
              </div>
              <button className="auth-btn" onClick={handleLogin} disabled={loading||!email||!pw}>
                {loading?<><div className="spin"/>{t.signingIn}</>:t.loginBtn}
              </button>
              <div style={{marginTop: 20, textAlign: "center", display: "flex", flexDirection: "column", gap: 14}}>
                <span onClick={()=>{setMode("forgot");setError("");setSuccess("");}} className="auth-link" style={{fontSize: 13}}>
                  {t.forgotPw}
                </span>
                <div style={{height: "1px", background: "var(--s100)", margin: "4px 0"}}></div>
                <span onClick={()=>{setMode("register");reset();}} className="auth-link font-bold" style={{fontSize: 14}}>
                  {t.noAccount} <span style={{textDecoration: "underline"}}>{t.createHere}</span>
                </span>
              </div>
              <div className="demo-box" onClick={()=>{setEmail("cesalie@gmail.com");setPw("harvest2024");}} style={{marginTop:24, background:"#f3f4f6"}}>
                <div style={{fontWeight:700,marginBottom:4}}><i className="bi bi-key"></i> Farmer Demo</div>
                <div style={{fontSize:11, color:"var(--s600)"}}><code>cesalie@gmail.com</code> | <code>harvest2024</code></div>
              </div>
              <div className="demo-box" onClick={()=>{setEmail("marie@sector.gov.rw");setPw("harvest2024");}} style={{marginTop:8, background:"#f3f4f6"}}>
                <div style={{fontWeight:700,marginBottom:4}}><i className="bi bi-person-badge"></i> Sector Officer (Nyamata)</div>
                <div style={{fontSize:11, color:"var(--s600)"}}><code>marie@sector.gov.rw</code> | <code>harvest2024</code></div>
              </div>
              <div className="demo-box" onClick={()=>{setEmail("pascal@district.gov.rw");setPw("harvest2024");}} style={{marginTop:8, background:"rgba(22, 163, 74, 0.1)", border:"1px solid var(--g200)"}}>
                <div style={{fontWeight:700,marginBottom:4, color:"var(--g800)"}}><i className="bi bi-shield-lock"></i> District Admin (User 3)</div>
                <div style={{fontSize:11, color:"var(--g700)"}}><code>pascal@district.gov.rw</code> | <code>harvest2024</code></div>
              </div>
            </>
          )}

          {mode==="forgot" && (
            <>
              <div style={{textAlign:"center",marginBottom:16}}>
                <div style={{fontSize:40,marginBottom:8}}><i className="bi bi-unlock"></i></div>
                <div style={{fontSize:18,fontWeight:800,color:"var(--g900)"}}>{t.forgotTitle}</div>
                <div style={{fontSize:12,color:"var(--s500)",marginTop:4,lineHeight:1.5}}>Enter your email to reset your password</div>
              </div>

              <div className="fgrp">
                <label className="flabel"><i className="bi bi-envelope"></i> Email Address</label>
                <input className="academic-input" placeholder="user@example.com"
                  value={resetEmail} onChange={e=>setResetEmail(e.target.value)}/>
              </div>

              <div className="fgrp" style={{position:"relative"}}>
                <label className="flabel"><i className="bi bi-lock"></i> {t.newPwLabel}</label>
                <input className="academic-input" type={showPw?"text":"password"} placeholder={t.newPwLabel}
                  value={newPw} onChange={e=>setNewPw(e.target.value)} style={{paddingRight:46}}/>
                <button onClick={()=>setShowPw(!showPw)} className="pw-toggle" style={{fontSize:16, top:36, textTransform:"none"}}>
                  {showPw?(<i className="bi bi-eye-slash"></i>):(<i className="bi bi-eye"></i>)}
                </button>
              </div>

              <div className="fgrp">
                <label className="flabel"><i className="bi bi-check2-circle"></i> {t.confirmNewPw}</label>
                <input className="academic-input" type="password" placeholder={t.confirmNewPw}
                  value={confPw} onChange={e=>setConfPw(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleForgotPassword()}/>
              </div>

              <button className="auth-btn" onClick={handleForgotPassword}
                disabled={loading||!resetEmail||!newPw||!confPw}>
                {loading?<><div className="spin"/>{"Resetting…"}</>:t.resetBtn}
              </button>

              <div style={{textAlign:"center",marginTop:16}}>
                <span onClick={()=>{setMode("login");setError("");setSuccess("");setResetEmail("");setNewPw("");setConfPw("");}} className="auth-link">
                  {t.backToLogin}
                </span>
              </div>
            </>
          )}

          {mode==="register" && (
            <>
              <div style={{textAlign:"center", marginBottom:16}}>
                <div style={{fontSize:18, fontWeight:800, color:"var(--g900)"}}>{t.register}</div>
              </div>
              <div className="fgrp">
                <label className="flabel"><i className="bi bi-person"></i> {t.fullName} *</label>
                <input className="academic-input" placeholder={lang==="rw"?"Urugero: Amina Uwimana":"e.g. Amina Uwimana"} value={name} onChange={e=>setName(e.target.value)}/>
              </div>
              <div className="fgrp">
                <label className="flabel"><i className="bi bi-envelope"></i> Email Address *</label>
                <input className="academic-input" type="email" placeholder="user@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
              </div>
              
              <div className="fgrp">
                <label className="flabel"><i className="bi bi-geo-alt"></i> {lang==="en"?"Main Farm Sector":"Segiteri y'Umurenge"} *</label>
                <select className="academic-input" value={sector} onChange={e=>setSector(e.target.value)}>
                   <option value="">{lang==="rw"?"Hitamo…":"Select…"}</option>
                   {SECTORS.map(d=><option key={d}>{d}</option>)}
                </select>
              </div>

              <div className="fgrp">
                <label className="flabel"><i className="bi bi-rulers"></i> {t.farmSizeHa} *</label>
                <input className="academic-input" type="number" step="0.1" placeholder="e.g. 0.5" 
                  value={farmHa} onChange={e=>setFarmHa(e.target.value)}/>
              </div>

              <div className="fgrp" style={{display:"flex", alignItems:"center", gap:10, cursor:"pointer", userSelect:"none"}} onClick={()=>setAgreedTerms(!agreedTerms)}>
                <input type="checkbox" checked={agreedTerms} onChange={e=>setAgreedTerms(e.target.checked)} style={{width:18, height:18, accentColor:"var(--g700)", cursor:"pointer"}}/>
                <span style={{fontSize:12, color:"var(--s600)", lineHeight:1.3}}>{t.agreeTerms}</span>
              </div>

              {!generatedPw && (
                <button className="auth-btn" onClick={handleRegister}
                  disabled={loading||!name||!email||!sector||!farmHa}>
                  {loading?<><div className="spin"/>{t.creatingAccount}</>:(<><i className="bi bi-person-plus"></i> {t.registerBtn}</>)}
                </button>
              )}
              
              {generatedPw && (
                <button className="auth-btn btn-outline" onClick={()=>{setMode("login"); setPw(generatedPw); setSuccess("");}}>
                  Proceed to Login
                </button>
              )}

              <div style={{textAlign:"center",marginTop:16}}>
                <span onClick={()=>{setMode("login");reset();}} className="auth-link">
                  {t.alreadyHave} {t.signInHere}
                </span>
              </div>
            </>
          )}

          <div style={{textAlign:"center",marginTop:32,paddingTop:16,borderTop:"1px solid var(--s200)",fontSize:11,color:"var(--s500)",fontWeight:500}}>
            🌾 {lang==="rw" ? "Urunyobwe rw'Ubuhinzi bwa Bugesera" : "Bugesera Agricultural System"} · Rwanda Polytechnic
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
function NotificationsScreen({notifications,setNotifications,onNavigate,lang,setLang,user}) {
  const t = T[lang];
  const clearAll = () => setNotifications([]);
  const removeOne = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

  return (
    <>
      <Topbar title={(<><i className="bi bi-bell"></i> {t.districtAlerts || "Notifications"}</>)} 
        onBack={() => onNavigate("dashboard")} 
        lang={lang} setLang={setLang}
        actions={<button className="tb-btn" onClick={clearAll} title="Clear All"><i className="bi bi-trash"></i></button>}
      />
      <div className="scroll fade-up">
        {notifications.length === 0 ? (
          <div style={{textAlign:"center", padding:40, color:"var(--s400)"}}>
            <div style={{fontSize:48, marginBottom:16, opacity:0.5}}><i className="bi bi-bell"></i></div>
            <div style={{fontSize:16, fontWeight:700, marginBottom:8}}>No notifications</div>
            <div style={{fontSize:13}}>You're all caught up! Important alerts will appear here.</div>
            <button className="tb-btn" style={{marginTop:20, color:"#007AFF"}} onClick={() => onNavigate("dashboard")}>
               Go Back Home
            </button>
          </div>
        ) : (
          <div style={{paddingBottom:80}}>
            {notifications.map(n => (
              <div key={n.id} className="notif-item" style={{display:"flex", gap:12, background:"#fff", padding:16, borderRadius:12, marginBottom:12, border:"1px solid #eee", position:"relative"}}>
                <div style={{fontSize:24}}>{n.type==="success"?(<i className="bi bi-check-circle"></i>):"ℹ"}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800, fontSize:14, color:"var(--s900)"}}>{n.title}</div>
                  <div style={{fontSize:11, color:"var(--g700)", fontWeight:700, marginTop:2}}>
                    <i className="bi bi-person-badge"></i> {n.sender || "Bugesera District"}
                  </div>
                  <div style={{fontSize:13, color:"var(--s600)", marginTop:6, lineHeight:1.4}}>{n.message}</div>
                  <div style={{fontSize:11, color:"var(--s400)", marginTop:8}}>
                    <i className="bi bi-clock"></i> {new Date(n.date).toLocaleString([], {month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit'})}
                  </div>
                </div>
                <button onClick={() => removeOne(n.id)} style={{background:"none", border:"none", fontSize:16, cursor:"pointer", color:"#ccc"}}><i className="bi bi-x"></i></button>
              </div>
            ))}
            <div style={{textAlign:"center", marginTop:20}}>
              <button className="auth-btn" style={{background:"#f3f4f6", color:"var(--s600)", fontWeight:600}} onClick={clearAll}>
                Clear All Notifications
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function DashboardScreen({user,onNavigate,history,lang,setLang,notifications}) {
  const t = T[lang];
  const unreadCount = notifications.filter(n => !n.read).length;
  const farmHa   = user.farm_size_ha  || 0;
  const farmAre  = user.farm_size_are || Math.round(farmHa*100);
  return (
    <>
      <Topbar title={(<><i className="bi bi-tree"></i> {lang==="en"?"Farmer DashBoard":t.appName}</>)} sub="Bugesera District" onBack={null} lang={lang} setLang={setLang}
        actions={
          <>
            <button className="tb-btn" onClick={()=>onNavigate("profile")}><i className="bi bi-person"></i></button>
            <button className="tb-btn" onClick={()=>onNavigate("notifications")} style={{position:"relative"}}>
              <i className="bi bi-bell"></i>
              {notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
            </button>
          </>
        }
      />
      <div className="scroll fade-up">
        <div className="card card-hero" style={{marginBottom:14,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",fontSize:60,opacity:.2}}><i className="bi bi-flower1"></i></div>
          <div style={{fontSize:16,fontWeight:700,opacity:.85}}>{t.welcome}, {user.name.split(" ")[0]}! <i className="bi bi-hand-wave"></i></div>
          <div style={{fontSize:12,opacity:.8,marginTop:3,fontFamily:"JetBrains Mono,monospace"}}>{t.farmerId}: {user.id} · <i className="bi bi-geo-alt"></i> {user.sector} Sector</div>
          <div style={{display:"flex",gap:20,marginTop:16,paddingTop:14,borderTop:"1px solid rgba(255,255,255,.2)",flexWrap:"wrap"}}>
            {[[`${farmHa}ha`,t.totalFarmSize],[history.length,t.predictions]].map(([v,l])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontWeight:800,fontSize:18}}>{v}</div>
                <div style={{fontSize:10,opacity:.75,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-blue" style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,opacity:.85,marginBottom:10}}><i className="bi bi-bar-chart-line"></i> {t.farmSummary}</div>
          {[[t.totalFarmSize,`${farmHa} ha = ${farmAre} are`],
            [t.activeCrops,"Maize, Beans, Rice"],
            [t.predictionsMade,String(history.length)]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,.15)"}}>
              <span style={{fontSize:13,opacity:.9}}>{k}</span>
              <span style={{fontWeight:800,fontSize:14}}>{v}</span>
            </div>
          ))}
        </div>

        {/* Dashboard Actions - Expanded to 4 columns for wide layout */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:18}}>
          {[[(<i className="bi bi-tree"></i>),"NEW PREDICTION",lang==="en"?"Get Harvest Prediction":"Bona Ibisobanuro","card-hero","predict"],
            [(<i className="bi bi-graph-up"></i>),"VIEW HISTORY",t.predHistory,"card-purple","history"],
            [(<i className="bi bi-cloud-sun"></i>),"WEATHER INFO","Climate conditions","card-blue","weather"],
            [(<i className="bi bi-book"></i>),"TIPS & ADVICE","Farming guidance","card-amber","tips"]].map(([icon,label,desc,cls,act])=>(
            <button key={act} className={`card ${cls} btn`}
              style={{flexDirection:"column",gap:8,alignItems:"flex-start",textAlign:"left",cursor:"pointer",padding:16}}
              onClick={()=>onNavigate(act)}>
              <span style={{fontSize:28}}>{icon}</span>
              <div>
                <div style={{fontWeight:800,fontSize:11,letterSpacing:".5px"}}>{label}</div>
                <div style={{fontSize:11,opacity:.85,marginTop:2}}>{desc}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="sec-hd"><i className="bi bi-clipboard-data"></i> {t.recentPredictions}</div>
        {history.length===0 && (
          <div style={{textAlign:"center",padding:"20px",color:"var(--s400)",fontSize:13}}>
            No predictions yet. Make your first prediction!
          </div>
        )}
        {history.slice(0,3).map((p,i)=>(
          <div key={i} className="hitem" onClick={()=>{ if(onResult){onResult(p);} else onNavigate("history"); }}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div className="hitem-icon">
                <CropIcon name={p.crop} style={{fontSize:24}} />
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14}}>{p.crop}</div>
                <div style={{fontSize:12,color:"var(--s500)",marginTop:2}}>
                  <i className="bi bi-calendar"></i> {fmtDate(p.timestamp)} · {p.sector}
                </div>
              </div>
              <div>
                <div className="hitem-yield">{p.yield_per_are_kg}<span style={{fontSize:11}}>kg</span></div>
                <div style={{fontSize:10,color:"var(--s400)",textAlign:"right"}}>/are</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── PREDICT ───────────────────────────────────────────────────────────────────
function PredictScreen({user,onNavigate,onResult,onSave,history=[],lang,setLang}) {
  const t = T[lang];
  const [step,setStep]       = useState(1);
  const [loading,setLoading] = useState(false);
  const [offline,setOffline] = useState(false);
  const [form,setForm]       = useState({
    crop:"", sector:user.sector||"", season:"", month:"",
    plantingDate:"", areaPlantedHa:String(user.farm_size_ha||""),
    soil: SECTOR_SOIL_TYPE[user.sector||""]||"Clay Soil",
    farmerCategory:"Medium", previousCrop:"Beans", laborAvail:"Adequate",
    pestPressure:"Low", extensionAccess:"Yes", creditAccess:"No",
    fertilizer:false, irrigation:false,
  });
  const set = useCallback((k,v)=>setForm(f=>({...f,[k]:v})),[]);

  const autoClimate = (form.month&&form.season)?getClimate(form.month,form.season):null;

  const step1Valid = form.crop && form.sector && form.season && form.month
                  && form.areaPlantedHa && form.plantingDate;

  const handleDateChange = (val)=>{
    set("plantingDate",val);
    if(val){
      const d = new Date(val);
      const mo = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"][d.getMonth()];
      set("month",mo);
      set("season",getSeasonFromMonth(mo));
    }
  };

  const handlePredict = async ()=>{
    setLoading(true);
    const areaAre     = Math.round(parseFloat(form.areaPlantedHa)*100);
    const farmAre     = areaAre;  // area planted IS the farm size sent to model
    const clim        = getClimate(form.month,form.season);
    const payload     = {
      farmer_id       : user.id,
      crop            : form.crop,
      sector          : form.sector,
      season          : form.season,
      month           : form.month,
      planting_date   : form.plantingDate,
      farm_size       : farmAre,
      area_planted    : areaAre,
      farmer_category : form.farmerCategory,
      fertilizer_used : form.fertilizer,
      irrigation_used : form.irrigation,
      soil_type       : form.soil,
      previous_crop   : form.previousCrop||'Beans',
      labor_availability: form.laborAvail||'Adequate',
      pest_pressure   : form.pestPressure||'Low',
      extension_access: form.extensionAccess||'Yes',
      credit_access   : form.creditAccess||'No',
      temperature     : clim.temperature,
      rainfall        : clim.rainfall,
      humidity        : clim.humidity,
      sunshine        : clim.sunshine,
      wind_speed      : clim.windSpeed,
      evapotranspiration: clim.evapotranspiration,
    };

    try {
      const res = await fetch(`${API_BASE}/api/predict`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      if(!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setLoading(false); setOffline(false);
      if (onSave) await onSave(data);
      onResult(data); onNavigate("result");
    } catch(err) {
      // Offline fallback
      setOffline(true);
      const yieldPA  = simulateOffline({
        crop:form.crop, month:form.month, season:form.season,
        farmSizeAre:areaAre, areaPlantedAre:areaAre,
        fertilizer:form.fertilizer, irrigation:form.irrigation, soil:form.soil
      });
      const result = {
        id               : `PRED-${Date.now().toString().slice(-6)}`,
        timestamp        : new Date().toISOString(),
        farmer_id        : user.id,
        crop             : form.crop,
        sector           : form.sector,
        season           : form.season,
        month            : form.month,
        planting_date    : form.plantingDate,
        farm_size_are    : farmAre,
        farm_size_ha     : parseFloat(form.farmSizeHa),
        area_planted_are : areaAre,
        area_planted_ha  : areaAre/100,
        yield_per_are_kg : yieldPA,
        yield_per_ha_kg  : Math.round(yieldPA*100*10)/10,
        total_yield_kg   : Math.round(yieldPA*areaAre*10)/10,
        yield_range      : `${Math.round(yieldPA*0.92*10)/10}–${Math.round(yieldPA*1.08*10)/10} kg/are`,
        confidence_pct   : 84.8,
        model_used       : "Local Simulation (API offline)",
        district_avg_kg_are: CROP_BENCH[form.crop]||20,
        inputs           : {temperature:clim.temperature,rainfall:clim.rainfall,
                            humidity:clim.humidity,sunshine:clim.sunshine,
                            fertilizer_used:form.fertilizer,irrigation_used:form.irrigation,
                            soil_type:form.soil,climate_source:"auto"},
        recommendations  : buildRecs(form.crop, yieldPA, {
          area_are     : areaAre,
          history      : history,
          fertilizer   : form.fertilizer,
          irrigation   : form.irrigation,
          soil         : form.soil,
          season       : form.season,
          month        : form.month,
          pest         : form.pestPressure||"Low",
          prevCrop     : form.previousCrop||"Beans",
          sector       : form.sector,
          labor        : form.laborAvail||"Adequate",
          credit       : form.creditAccess||"No",
          extension    : form.extensionAccess||"Yes",
          plantingDate : form.plantingDate,
        }),
      };
      setLoading(false);
      onResult(result);
      if (onSave) onSave(result);
      onNavigate("result");
    }
  };

  return (
    <>
      <Topbar title={t.newPred} sub={`${t.stepOf} ${step}/2`}
        onBack={()=>step===1?onNavigate("dashboard"):setStep(1)}
        lang={lang} setLang={setLang}
        actions={null}/>
      <div className="steps-bar"><div className="steps-fill" style={{width:`${step*50}%`}}/></div>
      {offline && <div className="alert alert-err" style={{margin:"8px 16px 0"}}>{t.offlineMode}</div>}
      <div className="scroll fade-up">

        {step===1 ? (
          <>
            <div style={{marginBottom:18}}>
              <div style={{fontSize:18,fontWeight:800,color:"var(--s900)"}}>{t.enterFarmDetails}</div>
              <div style={{fontSize:13,color:"var(--s500)",marginTop:3}}>{t.stepOf} 1/2 — {t.cropLocation}</div>
            </div>

            {/* Crop */}
            <div className="fgrp">
              <label className="flabel">{t.selectCrop}</label>
              <div className="crop-grid">
                {CROPS.map(c=>(
                  <button key={c} className={`crop-btn ${form.crop===c?"sel":""}`} onClick={()=>set("crop",c)}>
                    <div className="crop-btn-icon">
                      {CROP_ICON[c]?.startsWith('/icons/') 
                        ? <img src={CROP_ICON[c]} alt={c} /> 
                        : <i className={CROP_ICON[c]}></i>}
                    </div>
                    <span className="crop-btn-name">{c}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Area Planted — main size field sent to model */}
            <div className="fgrp">
              <label className="flabel"><i className="bi bi-rulers"></i> {t.areaPlantedHa}</label>
              <input className="finput" type="number" min="0.01" max="25" step="0.01"
                placeholder={lang==="en"?"e.g. 1.50 ha":"urugero: 1.50 ha"}
                value={form.areaPlantedHa}
                onChange={e=>set("areaPlantedHa",e.target.value)}/>
              {form.areaPlantedHa && (
                <div className="hint">
                  = {Math.round(parseFloat(form.areaPlantedHa)*100)} are
                  {parseFloat(form.areaPlantedHa)<0.5 ? (<> · <i className="bi bi-circle-fill"></i> Small farm</>) :
                   parseFloat(form.areaPlantedHa)<=1.5 ? (<> · <i className="bi bi-circle-fill"></i> Medium farm</>) : (<> · <i className="bi bi-circle-fill"></i> Large farm</>)}
                </div>
              )}
            </div>

            {/* Farmer Category */}
            <div className="fgrp">
              <label className="flabel">{t.farmerCategory}</label>
              <select className="finput" value={form.farmerCategory} onChange={e=>set("farmerCategory",e.target.value)}>
                <option value="Small">Small (&lt; 50 are)</option>
                <option value="Medium">Medium (50–150 are)</option>
                <option value="Large">Large (&gt; 150 are)</option>
              </select>
            </div>

            {/* Sector + Season */}
            <div className="frow">
              <div>
                <label className="flabel">{t.districtSector}</label>
                <select className="finput" value={form.sector} onChange={e=>{
                    set("sector",e.target.value);
                    set("soil", SECTOR_SOIL_TYPE[e.target.value]||"Clay Soil");
                  }}>
                  <option value="">{t.selectLocation}</option>
                  {SECTORS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="flabel">{t.season}</label>
                <select className="finput" value={form.season} onChange={e=>set("season",e.target.value)}>
                  <option value="">{t.selectSeason}</option>
                  {SEASONS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Planting Date → auto-fills Month AND Season */}
            <div className="frow">
              <div>
                <label className="flabel"><i className="bi bi-calendar"></i> {t.plantingDate}</label>
                <input className="finput" type="date" value={form.plantingDate}
                  onChange={e=>handleDateChange(e.target.value)}/>
                {form.month && (
                  <div className="hint">
                    <i className="bi bi-calendar"></i> {form.month} · <span style={{color:"var(--amber-d)",fontWeight:800}}>{form.season}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="flabel"><i className="bi bi-calendar-week"></i> {lang==="en"?"Season (auto)":"Igihe (bwite)"}</label>
                <select className="finput" value={form.season} onChange={e=>set("season",e.target.value)}>
                  <option value="">{t.selectSeason}</option>
                  {SEASONS.map(s=><option key={s}>{s}</option>)}
                </select>
                {form.season && <div className="hint-gray">{lang==="en"?"Auto-filled from date":"Yuzuzwa bwite"}</div>}
              </div>
            </div>

            {/* Soil Type — auto-detected from sector, from dataset */}
            <div className="fgrp">
              <label className="flabel"><i className="bi bi-flower2"></i> {t.soilType}
                <span style={{fontSize:10,fontWeight:500,color:"var(--s400)",marginLeft:6,textTransform:"none",letterSpacing:0}}>
                  {lang==="en"?"auto from sector":"bwite kuva ku Segiteri"}
                </span>
              </label>
              {form.sector ? (() => {
                const st  = SECTOR_SOIL_TYPE[form.sector] || "Clay Soil";
                const sd  = SOIL_DISPLAY[st] || SOIL_DISPLAY["Clay Soil"];
                return (
                  <div style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",
                    borderRadius:10,border:`2px solid ${sd.color}`,background:sd.bg}}>
                    <span style={{fontSize:28}}>{sd.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:800,fontSize:15,color:sd.color}}>{st}</div>
                      <div style={{fontSize:12,color:"var(--s600)",marginTop:2}}>
                        {lang==="en"
                          ?`Soil Quality: ${sd.health} · ${form.sector} sector`
                          :`Ubwoko bw'Ubutaka: ${sd.health} · Segiteri ${form.sector}`}
                      </div>
                    </div>
                    <span style={{fontSize:11,fontWeight:800,padding:"4px 10px",borderRadius:99,
                      background:sd.color,color:"white"}}>{sd.health}</span>
                  </div>
                );
              })() : (
                <div style={{padding:"13px 16px",borderRadius:10,border:"2px dashed var(--s200)",
                  background:"var(--s50)",color:"var(--s400)",fontSize:13,textAlign:"center"}}>
                  {lang==="en"?"← Select sector to detect soil type":"← Hitamo Segiteri kubona ubwoko bw'ubutaka"}
                </div>
              )}
            </div>

            {/* Live Climate Preview */}
            <ClimateCard climate={autoClimate} month={form.month} season={form.season} lang={lang}/>

            {/* Fertilizer */}
            <div className="fgrp">
              <label className="flabel">{t.fertilizerUsed}</label>
              <div className="toggle-group">
                <button className={`toggle-opt ${form.fertilizer?"sel":""}`} onClick={()=>set("fertilizer",true)}>{t.yes}</button>
                <button className={`toggle-opt ${!form.fertilizer?"sel":""}`} onClick={()=>set("fertilizer",false)}>{t.no}</button>
              </div>
            </div>

            {/* Irrigation */}
            <div className="fgrp">
              <label className="flabel">{t.irrigationUsed}</label>
              <div className="toggle-group">
                <button className={`toggle-opt ${form.irrigation?"sel":""}`} onClick={()=>set("irrigation",true)}>{t.yes}</button>
                <button className={`toggle-opt ${!form.irrigation?"sel":""}`} onClick={()=>set("irrigation",false)}>{t.no}</button>
              </div>
            </div>

            {/* Previous Crop — affects soil nutrients available */}
            <div className="fgrp">
              <label className="flabel"><i className="bi bi-arrow-repeat"></i> {lang==="en"?"Previous Crop":"Igihingwa Cyahinzwe"}</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[["Beans",(<CropIcon name="Beans"/>)],["Maize",(<CropIcon name="Maize"/>)],["Rice",(<CropIcon name="Rice"/>)],["Fallow",(<i className="bi bi-flower3"></i>)],["Cassava",(<i className="bi bi-circle"></i>)]].map(([pc,icon])=>(
                  <button key={pc} onClick={()=>set("previousCrop",pc)}
                    style={{padding:"8px 12px",borderRadius:10,border:`2px solid ${form.previousCrop===pc?"var(--g600)":"var(--s200)"}`,
                      background:form.previousCrop===pc?"var(--g100)":"white",cursor:"pointer",
                      display:"flex",alignItems:"center",gap:8,
                      fontFamily:"Outfit,sans-serif",fontSize:12,fontWeight:700,
                      color:form.previousCrop===pc?"var(--g800)":"var(--s600)"}}>
                    {icon} {pc}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional model features */}
            <div className="frow">
              <div>
                <label className="flabel"><i className="bi bi-bug"></i> {lang==="en"?"Pest Pressure":"Udukoko"}
                  {form.month && <span style={{fontSize:10,color:"var(--s400)",fontWeight:500,marginLeft:4,textTransform:"none"}}>
                    {lang==="en"?"auto from month":"bwite"}
                  </span>}
                </label>
                {(() => {
                  const lv = form.pestPressure||"Low";
                  const col = lv==="Low"?"var(--g600)":lv==="Medium"?"var(--amber)":"var(--red)";
                  const bg  = lv==="Low"?"var(--g100)":lv==="Medium"?"var(--amber-l)":"var(--red-l)";
                  const icon= lv==="Low"?(<i className="bi bi-circle-fill"></i>):lv==="Medium"?(<i className="bi bi-circle-fill"></i>):(<i className="bi bi-circle-fill"></i>);
                  return (
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",
                      borderRadius:9,border:`2px solid ${col}`,background:bg}}>
                      <span style={{fontSize:20}}>{icon}</span>
                      <div>
                        <div style={{fontWeight:800,fontSize:14,color:col}}>{lv} Risk</div>
                        <div style={{fontSize:11,color:"var(--s500)",marginTop:1}}>
                          {form.month
                            ?(lang==="en"?`Auto-detected for ${form.month}`:`Byashyizwe bwite kuri ${form.month}`)
                            :(lang==="en"?"Select planting date to auto-detect":"Hitamo itariki")}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div>
                <label className="flabel"><i className="bi bi-person-fill-gear"></i> {lang==="en"?"Labor":"Akazi"}</label>
                <select className="finput" value={form.laborAvail||"Adequate"} onChange={e=>set("laborAvail",e.target.value)}>
                  <option value="Adequate">Adequate</option>
                  <option value="Sufficient">Sufficient</option>
                  <option value="Limited">Limited</option>
                </select>
              </div>
            </div>

            <div className="frow">
              <div>
                <label className="flabel"><i className="bi bi-broadcast"></i> {lang==="en"?"Extension Service":"Serivisi"}</label>
                <div className="toggle-group">
                  <button className={`toggle-opt ${(form.extensionAccess||"Yes")==="Yes"?"sel":""}`} onClick={()=>set("extensionAccess","Yes")}>{t.yes}</button>
                  <button className={`toggle-opt ${(form.extensionAccess||"Yes")==="No"?"sel":""}`}  onClick={()=>set("extensionAccess","No")}>{t.no}</button>
                </div>
              </div>
              <div>
                <label className="flabel"><i className="bi bi-credit-card"></i> {lang==="en"?"Credit Access":"Inguzanyo"}</label>
                <div className="toggle-group">
                  <button className={`toggle-opt ${(form.creditAccess||"No")==="Yes"?"sel":""}`}   onClick={()=>set("creditAccess","Yes")}>{t.yes}</button>
                  <button className={`toggle-opt ${(form.creditAccess||"No")==="No"?"sel":""}`}    onClick={()=>set("creditAccess","No")}>{t.no}</button>
                </div>
              </div>
            </div>

            <button className="btn btn-primary" onClick={()=>setStep(2)} disabled={!step1Valid}>{t.continueStep2}</button>
            <div style={{textAlign:"center",fontSize:11,color:"var(--s400)",marginTop:8}}>{t.requiredFields}</div>
          </>
        ) : (
          <>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:18,fontWeight:800,color:"var(--s900)"}}>{t.reviewPredict}</div>
              <div style={{fontSize:13,color:"var(--s500)",marginTop:3}}>{t.stepOf} 2/2 — {t.summary}</div>
            </div>

            {/* Summary Card - New Professional Layout */}
            <div className="card" style={{background:"var(--g50)", borderColor:"var(--g300)", marginBottom:14, padding:"16px 14px"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:15}}>
                <div style={{fontWeight:800, fontSize:14, color:"var(--g800)", display:"flex", alignItems:"center", gap:6}}>
                  <span style={{fontSize:18}}><i className="bi bi-clipboard-data"></i></span> {t.summary}
                </div>
                <button onClick={()=>setStep(1)} className="btn-edit" style={{fontSize:11, padding:"4px 10px", borderRadius:6}}>{t.edit}</button>
              </div>

              {/* Group 1: Crop & Land - Expanded to 4 columns */}
              <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"16px", marginBottom:18}}>
                {[
                  [(<CropIcon name={form.crop} />), t.cropType,       form.crop],
                  [(<i className="bi bi-rulers"></i>), t.areaPlantedHa.replace(" *",""), `${form.areaPlantedHa} ha`],
                  [(<i className="bi bi-geo-alt"></i>), t.location,       form.sector],
                  [(<i className="bi bi-calendar-week"></i>), t.plantingDate.replace(" *",""), form.plantingDate||"–"],
                ].map(([icon, k, v]) => (
                  <div key={k}>
                    <div style={{fontSize:10, fontWeight:700, color:"var(--s400)", textTransform:"uppercase", letterSpacing:".5px", marginBottom:4}}>{icon} {k}</div>
                    <div style={{fontSize:14, fontWeight:700, color:"var(--s900)"}}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Group 2: Inputs & Environment - Expanded to 5 columns */}
              <div style={{background:"rgba(255,255,255,0.5)", borderRadius:10, padding:16, display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:"16px 20px"}}>
                {[
                  ["Season", form.season],
                  ["Month", form.month],
                  ["Soil", form.soil],
                  ["Fertilizer", form.fertilizer?t.yes:t.no],
                  ["Irrigation", form.irrigation?t.yes:t.no],
                  ["Prev. Crop", form.previousCrop||"Beans"],
                  ["Pest Risk", form.pestPressure||"Low"],
                  ["Labor", form.laborAvail||"Adequate"],
                  ["Extension", (form.extensionAccess||"Yes")==="Yes"?t.yes:t.no],
                  ["Credit", (form.creditAccess||"No")==="Yes"?t.yes:t.no],
                ].map(([k, v]) => (
                  <div key={k} style={{display:"flex", flexDirection:"column", gap:2}}>
                    <span style={{fontSize:10, color:"var(--s500)", fontWeight:700, textTransform:"uppercase"}}>{k}</span>
                    <span style={{fontSize:13, fontWeight:800, color:"var(--s800)"}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Climate Preview */}
            <ClimateCard climate={autoClimate} month={form.month} season={form.season} lang={lang}/>

            <div style={{background:"var(--g50)",border:"1px solid var(--g300)",borderRadius:"var(--radius-sm)",padding:12,marginBottom:14,display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{fontSize:20}}>ℹ</div>
              <div style={{fontSize:12,color:"var(--g800)",lineHeight:1.6}}>
                <strong>{lang==="en"?"Climate data auto-loaded":"Amakuru y'ibihe yashyizwe bwite"}</strong><br/>
                {lang==="en"
                  ?`Based on ${form.month} historical averages for Bugesera District.`
                  :`Bikoreshwa hagamijwe ${form.month} muri Bugesera District.`}
              </div>
            </div>

            <button className="btn btn-primary" onClick={handlePredict} disabled={loading}>
              {loading?<><div className="spin"/>{t.runningModel}</>:t.getHarvestPrediction}
            </button>
          </>
        )}
      </div>
    </>
  );
}

// ── RESULT ────────────────────────────────────────────────────────────────────
function ResultScreen({result,onNavigate,onSave,history=[],lang,setLang}) {
  const t = T[lang];
  if (!result) return null;
  // Use season-specific benchmark from dataset:
  // Season A: Maize=23.86, Beans=12.17, Rice=37.96 kg/are
  // Season B: Maize=22.59, Beans=11.65, Rice=34.77 kg/are
  // Overall:  Maize=23.22, Beans=11.91, Rice=36.36 kg/are
  const SEASON_BENCH_RESULT = {
    "Season A": {Maize:23.86, Beans:12.17, Rice:37.96},
    "Season B": {Maize:22.59, Beans:11.65, Rice:34.77},
  };
  const seasonAvg = (SEASON_BENCH_RESULT[result.season]||SEASON_BENCH_RESULT["Season A"])[result.crop]
                    || result.district_avg_kg_are || 20;
  const pct = ((result.yield_per_are_kg - seasonAvg) / seasonAvg * 100);

  const generatePDF = () => {
    if(!window.jspdf || !window.jspdf.jsPDF) {
      alert("PDF library still loading, please wait a moment.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const t = T[lang];

    // Header
    doc.setFillColor(22, 163, 74); // var(--g600)
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Harvest Predictor - Official Report", 15, 25);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 150, 25);

    // Farmer Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("1. Farmer Information", 15, 55);
    doc.setFontSize(11);
    const farmerData = [
      ["Report ID", result.id],
      ["Farmer ID", result.farmer_id],
      ["Location", `Bugesera · ${result.sector}`],
      ["Crop Type", `${result.crop}`],
      ["Land Size", `${result.area_planted_are || result.farm_size_are} are`],
    ];
    doc.autoTable({
      startY: 60,
      head: [['Field', 'Details']],
      body: farmerData,
      theme: 'striped',
      headStyles: { fillColor: [22, 163, 74] }
    });

    // Prediction Result
    doc.setFontSize(14);
    doc.text("2. Prediction Analysis", 15, doc.lastAutoTable.finalY + 15);
    const predData = [
      ["Expected Yield (Range)", result.yield_range],
      ["Yield per Are", `${result.yield_per_are_kg} kg/are`],
      ["Total Estimate", `${result.total_yield_kg} kg`],
      ["ML Confidence Score", `${result.confidence_pct}%`],
      ["Model Used", result.model_used],
    ];
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Metric', 'Value']],
      body: predData,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] }
    });

    // Recommendations
    doc.setFontSize(14);
    doc.text("3. Agricultural Recommendations", 15, doc.lastAutoTable.finalY + 15);
    const recs = result.recommendations.map(r => [r.category, r.message]);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Category', 'Advice']],
      body: recs,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', width: 40 } }
    });

    // Footer
    const finalY = doc.lastAutoTable.finalY + 30;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Note: These estimates are based on ML models and historical weather patterns in Bugesera.", 15, finalY);
    doc.text("Always consult with local extension officers for field-specific decisions.", 15, finalY + 5);
    
    doc.save(`Harvest_Report_${result.id}.pdf`);
  };

  // ── History analysis — compare with farmer's own past predictions ──
  const sameCropHistory = history.filter(h =>
    h.crop === result.crop && h.id !== result.id
  );
  const sameSeasonHistory = history.filter(h =>
    h.crop === result.crop && h.season === result.season && h.id !== result.id
  );
  const histAvg = sameCropHistory.length > 0
    ? sameCropHistory.reduce((s,h) => s + h.yield_per_are_kg, 0) / sameCropHistory.length
    : null;
  const lastSame = sameSeasonHistory.length > 0
    ? sameSeasonHistory[sameSeasonHistory.length - 1]
    : null;
  const histTrend = histAvg
    ? ((result.yield_per_are_kg - histAvg) / histAvg * 100)
    : null;

  return (
    <>
      <Topbar title={lang==="en"?"Prediction Result":"Ibisobanuro"} sub={`ID: ${result.id}`}
        onBack={()=>onNavigate("dashboard")} lang={lang} setLang={setLang}/>
      <div className="scroll fade-up">
        <div className="result-hero">
          <div style={{fontSize:13,opacity:.75,marginBottom:4}}>{t.expectedHarvest}</div>
          <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>{t.predictionComplete}</div>
          <div style={{fontSize:48,marginBottom:12}}>
            <CropIcon name={result.crop} style={{fontSize:48}} />
          </div>
          <div className="result-big">{result.yield_range}</div>
          <div className="result-unit">{t.perAreEst}</div>
          <div className="result-meta">
            <div className="result-meta-item">
              <div className="result-meta-val">{result.total_yield_kg}kg</div>
              <div className="result-meta-lbl">{t.total} ({result.area_planted_are||result.farm_size_are}a)</div>
            </div>
            <div className="result-meta-item">
              <div className="result-meta-val">{result.confidence_pct}%</div>
              <div className="result-meta-lbl">{t.confidence}</div>
            </div>
            <div className="result-meta-item">
              <div className="result-meta-val">ML</div>
              <div className="result-meta-lbl">{t.modelUsed}</div>
            </div>
          </div>
        </div>

        {/* Key Numbers */}
        <div className="stat-grid">
          {[
            [(<CropIcon name={result.crop} />),`${result.yield_per_are_kg} kg/are`,"Yield per Are"],
            [(<i className="bi bi-house-fill"></i>),`${result.yield_per_ha_kg} kg/ha`,"Yield per Ha"],
            [(<i className="bi bi-box-seam"></i>),`${result.total_yield_kg} kg`,"Total Harvest"],
            [(<i className="bi bi-rulers"></i>),`${result.area_planted_are||result.farm_size_are}are`,"Area Planted"],
          ].map(([icon,val,lbl])=>(
            <div key={lbl} className="stat-box">
              <div style={{fontSize:22}}>{icon}</div>
              <div className="stat-val" style={{fontSize:15}}>{val}</div>
              <div className="stat-lbl">{lbl}</div>
            </div>
          ))}
        </div>

        {/* Comparison */}
        <div className="card" style={{marginBottom:14}}>
          <div className="sec-hd" style={{marginBottom:10}}><i className="bi bi-bar-chart-line"></i> {t.comparison}</div>
          {[[`${result.season||"Season"} average:`,`${seasonAvg.toFixed(2)} kg/are`],
            [t.yourPrediction,`${result.yield_per_are_kg} kg/are`]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid var(--s100)"}}>
              <span style={{fontSize:13,color:"var(--s500)"}}>{k}</span>
              <span style={{fontWeight:800,fontSize:14,color:"var(--g700)"}}>{v}</span>
            </div>
          ))}
          <div style={{marginTop:10,padding:8,background:pct>=0?"var(--g50)":"var(--amber-l)",borderRadius:8,textAlign:"center",fontSize:13,fontWeight:700,color:pct>=0?"var(--g800)":"var(--amber-d)"}}>
            {pct>=0
              ? (<><i className="bi bi-check-circle"></i> +{pct.toFixed(1)}% above {result.season||"season"} average ({seasonAvg.toFixed(1)} kg/are)</>)
              : (<><i className="bi bi-exclamation-triangle"></i> {pct.toFixed(1)}% below {result.season||"season"} average ({seasonAvg.toFixed(1)} kg/are)</>)}
          </div>
        </div>

        {/* History comparison card */}
        {sameCropHistory.length > 0 && (
          <div className="card" style={{marginBottom:14,borderColor:
            histTrend>=10?"var(--g300)":histTrend>=-10?"var(--s200)":"var(--red-l)"}}>
            <div className="sec-hd" style={{marginBottom:10}}>
              <i className="bi bi-graph-up"></i> Your {result.crop} Harvest History
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"8px 0",borderBottom:"1px solid var(--s100)"}}>
              <span style={{fontSize:13,color:"var(--s500)"}}>Your avg ({sameCropHistory.length} prediction{sameCropHistory.length>1?"s":""})</span>
              <span style={{fontWeight:800,fontSize:14,color:"var(--g700)"}}>{histAvg.toFixed(2)} kg/are</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"8px 0",borderBottom:"1px solid var(--s100)"}}>
              <span style={{fontSize:13,color:"var(--s500)"}}>This prediction</span>
              <span style={{fontWeight:800,fontSize:14,color:"var(--g700)"}}>{result.yield_per_are_kg} kg/are</span>
            </div>
            {lastSame && (
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"8px 0",borderBottom:"1px solid var(--s100)"}}>
                <span style={{fontSize:13,color:"var(--s500)"}}>Last {result.season}</span>
                <span style={{fontWeight:800,fontSize:14,color:"var(--g700)"}}>{lastSame.yield_per_are_kg} kg/are</span>
              </div>
            )}
            <div style={{marginTop:10,padding:"10px 14px",borderRadius:8,textAlign:"center",
              fontWeight:700,fontSize:13,
              background:histTrend>=10?"var(--g100)":histTrend>=-10?"var(--blue-l)":"var(--red-l)",
              color:histTrend>=10?"var(--g800)":histTrend>=-10?"var(--blue-d)":"var(--red-d)"}}>
              {histTrend>=10
                ? (<><i className="bi bi-check-circle"></i> +{histTrend.toFixed(1)}% better than your own average — improving!</>)
                : histTrend>=-10
                  ? (<><i className="bi bi-bar-chart-line"></i> {histTrend.toFixed(1)}% vs your own average — consistent</>)
                  : (<><i className="bi bi-exclamation-triangle"></i> {histTrend.toFixed(1)}% below your own average — needs attention</>)}
            </div>
          </div>
        )}


        {/* Soil info if available */}
        {result.soil_data && Object.keys(result.soil_data).length>0 && (
          <div className="card" style={{marginBottom:14}}>
            <div className="sec-hd" style={{marginBottom:10}}><i className="bi bi-flower2"></i> {t.soilInfo} — {result.sector}</div>
            {[["pH Level",result.soil_data.pH_Level],
              ["Nitrogen (ppm)",result.soil_data.Nitrogen_ppm],
              ["Phosphorus (ppm)",result.soil_data.Phosphorus_ppm],
              ["Potassium (ppm)",result.soil_data.Potassium_ppm]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--s100)"}}>
                <span style={{fontSize:13,color:"var(--s500)"}}>{k}</span>
                <span style={{fontWeight:700,fontSize:13}}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        <div className="sec-hd" style={{marginBottom:4}}>
          <i className="bi bi-clipboard-data"></i> {t.recommendations}
        </div>
        {/* Goal statement */}
        <div style={{background:"var(--g50)",border:"1px solid var(--g200)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"var(--g800)",display:"flex",alignItems:"flex-start",gap:8}}>
          <i className="bi bi-bullseye" style={{fontSize:15,marginTop:1,flexShrink:0}}></i>
          <span><strong>{lang==="en"?"Goal:":"Intego:"}</strong> {lang==="en"
            ? "Data-driven recommendations to help you optimize planting schedules, resource use, and harvest planning."
            : "Inama zishingiye ku makuru kugirango ugufashe gutegura ibibera, gukoresha ibikoresho, no gutegura gisarura."}
          </span>
        </div>
        {result.recommendations?.map((r,i)=>(
          <div key={i} className={`rec rec-${r.type}`} style={{marginBottom:10,borderRadius:14,padding:"14px 16px",display:"flex",flexDirection:"column",gap:6}}>
            {/* Header: icon + category */}
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:2}}>
              <div style={{
                width:34,height:34,borderRadius:10,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,
                background: r.type==="success"?"var(--g100)":r.type==="warning"?"#fef3c7":"#dbeafe",
                color: r.type==="success"?"var(--g700)":r.type==="warning"?"#92400e":"#1d4ed8"
              }}>
                <i className={`bi ${r.icon||'bi-lightbulb'}`}></i>
              </div>
              <div style={{fontWeight:800,fontSize:13,color: r.type==="success"?"var(--g800)":r.type==="warning"?"#92400e":"#1e3a8a",lineHeight:1.3}}>
                {r.category?.split(" / ")[lang==="en"?0:1] || r.category}
              </div>
            </div>
            {/* Bilingual message */}
            <div style={{fontSize:13,lineHeight:1.6,color:"var(--s700)",paddingLeft:43}}>
              {lang==="en" ? r.message : (r.message_rw || r.message)}
            </div>
            {/* Goal tag */}
            {r.goal && (
              <div style={{paddingLeft:43,marginTop:2}}>
                <span style={{fontSize:10,background:"rgba(0,0,0,0.05)",borderRadius:6,padding:"2px 8px",color:"var(--s500)",fontWeight:600}}>
                  ✔ {lang==="en"?"Goal: ":"Intego: "}{lang==="en" ? r.goal : (r.goal_rw || r.goal)}
                </span>
              </div>
            )}
          </div>
        ))}
        {/* Action Buttons Consolidated */}
        <div style={{display:"flex", flexDirection:"column", gap:10, marginTop:24, marginBottom:20}}>
          <button className="btn btn-primary" onClick={generatePDF} 
            style={{background:"var(--g700)", display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:"15px", borderRadius:14}}>
            <span style={{fontSize:20}}><i className="bi bi-file-earmark-text"></i></span> {lang==="en"?"Download Official Report (PDF)":"Gukuramo Raporo (PDF)"}
          </button>
          
          <div style={{display:"flex", gap:10}}>
            <button className="btn btn-secondary" onClick={()=>onNavigate("predict")} 
              style={{flex:1, border:"1px solid var(--s300)", background:"white", color:"var(--s700)", padding:"12px", borderRadius:12, fontWeight:700}}>
               <i className="bi bi-arrow-repeat"></i> {lang==="en"?"New Prediction":"Ibisobanuro bishya"}
            </button>
            <button className="btn btn-secondary" onClick={()=>onNavigate("dashboard")} 
              style={{flex:1, border:"1px solid var(--s300)", background:"white", color:"var(--s700)", padding:"12px", borderRadius:12, fontWeight:700}}>
               <i className="bi bi-house"></i> {lang==="en"?"Dashboard":"Ahabanza"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── HISTORY ───────────────────────────────────────────────────────────────────
function HistoryScreen({predictions,onNavigate,lang,setLang,setSelectedPred}) {
  const t = T[lang];
  const [crop,setCrop]       = useState("All");
  const [search,setSearch]   = useState("");
  const [yearFilter,setYearFilter] = useState("All");
  
  const hList = predictions || [];
  const filtered = hList.filter(p=>{
    if (!p) return false;
    const yr = new Date(p.created_at||p.timestamp||Date.now()).getFullYear();
    const pCrop = p.crop || p.crop_type || "Unknown";
    const pSector = p.sector || p.sector_name || "";
    return (crop==="All"||pCrop===crop) &&
           (yearFilter==="All"||String(yr)===String(yearFilter)) &&
           (!search||pCrop.toLowerCase().includes(search.toLowerCase())||
            pSector.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <>
      <Topbar title={t.predHistory} onBack={()=>onNavigate("dashboard")} lang={lang} setLang={setLang}/>
      <div className="scroll wide-scroll fade-up">
        <input className="finput" placeholder={t.searchCrop} value={search}
          onChange={e=>setSearch(e.target.value)} style={{marginBottom:12}}/>
        <div className="frow" style={{marginBottom:14}}>
          <select className="finput" value={crop} onChange={e=>setCrop(e.target.value)}>
            <option value="All">{t.allCrops}</option>
            {CROPS.map(c=><option key={c}>{c}</option>)}
          </select>
          <select className="finput" value={yearFilter} onChange={e=>setYearFilter(e.target.value)}>
            <option value="All">All Years</option>
            {[2026,2025,2024,2023,2022,2021,2020].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="card card-hero" style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <div style={{textAlign:"center", flex:1}}>
              <div style={{fontSize:12,opacity:.8,marginBottom:4}}><i className="bi bi-bar-chart-line"></i> {t.overallStats}</div>
              <div style={{fontSize:38,fontWeight:800,fontFamily:"JetBrains Mono,monospace"}}>{hList.length}</div>
              <div style={{fontSize:12,opacity:.75}}>{t.totalPredictions}</div>
            </div>
          </div>
        </div>

        {filtered.length===0 && (
          <div style={{textAlign:"center",padding:"30px",color:"var(--s400)",fontSize:13}}>
            No predictions found. Make a new prediction!
          </div>
        )}

        {filtered.map((p,i)=>{
          const pCrop = p.crop || p.crop_type || "Maize";
          const thresh = YIELD_THRESHOLDS[pCrop] || YIELD_THRESHOLDS.Maize;
          const yVal   = parseFloat(p.yield_per_are_kg || 0);
          
          const grade = p.yield_grade || (
            yVal >= thresh.excellent ? "Excellent" :
            yVal >= thresh.good ? "Good" :
            yVal >= thresh.avg ? "Average" : "Below Average"
          );
          
          const gColor = grade==="Excellent"?"var(--g600)":grade==="Good"?"var(--g500)":grade==="Average"?"var(--amber)":"var(--red)";
          const dateStr= fmtDate(p.created_at||p.timestamp);
          const revenue= Math.round(parseFloat(p.total_yield_kg||0) * ({Maize:300,Beans:600,Rice:500}[pCrop]||400));
          
          return (
          <div key={i} className="hitem" style={{borderLeft:`4px solid ${gColor}`,marginBottom:16, padding: "16px", cursor: setSelectedPred ? "pointer" : "default"}} onClick={() => setSelectedPred && setSelectedPred(p)}>
            <div style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:14}}>
              <div className="hitem-icon" style={{width: 50, height: 50, background: "var(--s50)", borderRadius: 12}}>
                <CropIcon name={pCrop} style={{fontSize:32}} />
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:16,color:"var(--g900)"}}>{pCrop} — {p.sector || p.sector_name || ""}</div>
                <div style={{fontSize:12,color:"var(--s500)",marginTop:2}}>
                  {p.season || ""} · {p.month||""} · <i className="bi bi-calendar"></i> {dateStr}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontWeight:800,fontSize:22,color:gColor,fontFamily:"JetBrains Mono,monospace"}}>
                  {yVal.toFixed(1)}
                </div>
                <div style={{fontSize:10,color:"var(--s400)",textTransform:"uppercase",fontWeight:700}}>kg/are</div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:0}}>
              {[
                [(<i className="bi bi-layers"></i>),"Total",`${parseFloat(p.total_yield_kg||0).toLocaleString()} kg`],
                [(<i className="bi bi-rulers"></i>),"Area",`${parseFloat(p.area_planted_are||p.area_planted_ha*100||0).toFixed(0)} are`],
                [(<i className="bi bi-cash-stack"></i>),"Revenue",`RWF ${revenue.toLocaleString()}`],
              ].map(([icon,label,val], idx)=>(
                <div key={idx}>
                  <div style={{fontSize:10,color:"var(--s400)",display:"flex",alignItems:"center",gap:4,marginBottom:2}}>{icon} {label}</div>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--s700)"}}>{val}</div>
                </div>
              ))}
            </div>
          </div>
          );
        })}
      </div>
    </>
  );
}

// ── WEATHER ───────────────────────────────────────────────────────────────────
function WeatherScreen({onNavigate,lang,setLang,user}) {
  const t = T[lang];
  const monthly = Object.entries(CLIMATE).map(([m,d])=>({m:m.slice(0,3),rain:d.rainfall,temp:d.temperature}));
  const maxR = Math.max(...monthly.map(d=>d.rain));
  return (
    <>
      <Topbar title={(<><i className="bi bi-cloud-sun"></i> {t.weatherTitle}</>)} sub="Bugesera District" onBack={()=>onNavigate("dashboard")} lang={lang} setLang={setLang}/>
      <div className="scroll fade-up">
        <div className="card card-blue" style={{marginBottom:14}}>
          <div style={{fontSize:12,opacity:.8,marginBottom:4}}><i className="bi bi-globe"></i> Bugesera · {t.currentSeason}</div>
          <div style={{fontSize:32,fontWeight:800,margin:"6px 0"}}>23.2°C <i className="bi bi-sun"></i></div>
          <div style={{display:"flex",gap:18,marginTop:12,flexWrap:"wrap",fontSize:13}}>
            <div><i className="bi bi-droplet"></i> 74% Humidity</div><div><i className="bi bi-cloud-rain"></i> 78mm Rainfall</div><div><i className="bi bi-sun"></i> 7.6h Sunshine</div>
          </div>
        </div>
        <div className="sec-hd"><i className="bi bi-bar-chart-line"></i> {t.monthlyRainfall}</div>
        <div className="card">
          {monthly.map(d=>(
            <div key={d.m} className="bar-row">
              <div className="bar-lbl">{d.m}</div>
              <div className="bar-track"><div className="bar-fill" style={{width:`${(d.rain/maxR)*100}%`}}/></div>
              <div className="bar-val">{d.rain}mm</div>
            </div>
          ))}
        </div>
        <div className="sec-hd"><i className="bi bi-thermometer-half"></i> {t.monthlyTemp}</div>
        <div className="card">
          {monthly.map(d=>(
            <div key={d.m} className="bar-row">
              <div className="bar-lbl">{d.m}</div>
              <div className="bar-track"><div className="bar-fill" style={{width:`${((d.temp-20)/8)*100}%`,background:"linear-gradient(90deg,#3b82f6,#f97316)"}}/></div>
              <div className="bar-val">{d.temp}°C</div>
            </div>
          ))}
        </div>
        <div className="card" style={{background:"var(--g50)",borderColor:"var(--g300)"}}>
          <div style={{fontWeight:800,fontSize:13,color:"var(--g800)",marginBottom:10}}><i className="bi bi-flower2"></i> {t.plantingCalendar}</div>
          {[["Season A (Oct–Jan)","Maize, Rice — main season, +10% yields"],
            ["Season B (Mar–Jul)","Beans, Vegetables — secondary season"],
            ["Best planting","Oct–Nov (Season A) · Mar–Apr (Season B)"]].map(([title,desc])=>(
            <div key={title} style={{padding:"7px 0",borderBottom:"1px solid var(--g200)"}}>
              <div style={{fontWeight:700,fontSize:12,color:"var(--g800)"}}>{title}</div>
              <div style={{fontSize:12,color:"var(--s600)",marginTop:2}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── TIPS ──────────────────────────────────────────────────────────────────────
function TipsScreen({onNavigate,lang,setLang,user}) {
  const t = T[lang];
  const [open,setOpen] = useState(null);
  const tips = [
    {icon:(<i className="bi bi-flower2"></i>),title:lang==="en"?"Soil Preparation":"Gutegura Ubutaka",bg:"var(--g50)",bc:"var(--g300)",tc:"var(--g800)",
     items:lang==="en"
       ?["Test soil pH every season — optimal 5.8–7.0 for Bugesera crops",
         "Add compost (20 kg/are) 2 weeks before planting",
         "Deep plow to 20–25cm to break hardpan",
         "Apply lime if pH < 5.5 (2 kg lime/are)"]
       :["Suzuma pH buri gihe — Bugesera: 5.8–7.0",
         "Ongeraho imborera (20 kg/are) ibyumweru 2 mbere yo gutera",
         "Hinga bugufi 20–25cm","Koresha lime niba pH < 5.5"]},
    {icon:(<i className="bi bi-droplet"></i>),title:lang==="en"?"Water Management":"Gucunga Amazi",bg:"var(--blue-l)",bc:"#93c5fd",tc:"var(--blue-d)",
     items:lang==="en"
       ?["Furrow or drip irrigation saves 30–40% water",
         "Water early morning (6–8am) to minimize evaporation",
         "Apply 4–6cm mulch to retain soil moisture",
         "Monitor at 15cm depth — irrigate when dry"]
       :["Kuhira mu mirwamo bigabanya amazi 30–40%",
         "Hira mu gitondo (6–8am)","Shyira imfuro (4–6cm)",
         "Suzuma ubuhehere 15cm munsi"]},
    {icon:(<i className="bi bi-flower1"></i>),title:lang==="en"?"Maize Agronomy":"Ubuhinzi bwa Ikigori",bg:"#fffbeb",bc:"#fde68a",tc:"var(--amber-d)",
     items:lang==="en"
       ?["Spacing: 75cm × 25cm (~53,000 plants/ha)",
         "Apply DAP 0.5kg/are at planting; top-dress CAN at knee-height",
         "Scout weekly for Fall Armyworm",
         "Harvest at grain moisture ≤25%; dry to ≤13% before storage"]
       :["Intambuko: 75cm × 25cm","Koresha DAP 50kg/akaro",
         "Shakisha Fall Armyworm buri cyumweru",
         "Geze ubushyuhe ≤25%"]},
    {icon:(<i className="bi bi-egg"></i>),title:lang==="en"?"Beans Agronomy":"Ubuhinzi bwa Ibishyimbo",bg:"var(--g50)",bc:"var(--g300)",tc:"var(--g800)",
     items:lang==="en"
       ?["Inoculate seeds with Rhizobium before planting",
         "Spacing: 40cm × 15cm; seed 3–4cm deep",
         "Weed at 2 and 4 weeks after germination",
         "Harvest when 90% of pods are dry"]
       :["Sugira imbuto na Rhizobium mbere yo gutera",
         "Intambuko: 40cm × 15cm","Kuraho ibyatsi mu cyumweru 2 no 4",
         "Geze uduke 90% w'indabo umeze"]},
    {icon:(<i className="bi bi-tree"></i>),title:lang==="en"?"Rice Agronomy":"Ubuhinzi bwa Umuceri",bg:"var(--purple-l)",bc:"#c4b5fd",tc:"#5b21b6",
     items:lang==="en"
       ?["Use certified flood-tolerant varieties (JASMINE 85 or NERICA)",
         "Transplant at 20×20cm spacing",
         "Keep paddy flooded 5cm during vegetative stage",
         "Apply urea 0.5kg/are at tillering"]
       :["Koresha ubwoko bwemewe (JASMINE 85 cyangwa NERICA)",
         "Tera inzuri 20×20cm","Bika amazi 5cm",
         "Koresha urea 50kg/akaro"]},
    {icon:(<i className="bi bi-bug"></i>),title:lang==="en"?"Pest Management":"Kurwanya Udukoko",bg:"var(--red-l)",bc:"#fca5a5",tc:"var(--red-d)",
     items:lang==="en"
       ?["Scout every 7 days during growing season",
         "Report Fall Armyworm to RAB extension",
         "Use neem oil (5ml/L) as first-line control",
         "Rotate crops each season"]
       :["Suzuma buri minsi 7","Menyesha RAB Fall Armyworm ubibonye",
         "Koresha amavuta ya neem (5ml/L)",
         "Hindura ibihingwa buri gihe"]},
  ];

  return (
    <>
      <Topbar title={(<><i className="bi bi-book"></i> {t.tipsTitle}</>)} sub={t.tipsSubtitle} onBack={()=>onNavigate("dashboard")} lang={lang} setLang={setLang}/>
      <div className="scroll wide-scroll fade-up">
        <div style={{fontSize:12,color:"var(--s500)",marginBottom:14,width:"100%",margin:"0 auto"}}><i className="bi bi-clipboard-data"></i> {t.tailoredTips}</div>
        {tips.map((tip,i)=>(
          <div key={i} className="tip-card" 
            style={{
              background:tip.bg,
              border:`1.5px solid ${tip.bc}`,
              borderRadius:"var(--radius)",
              padding:20,
              marginBottom:12,
              cursor:"pointer",
              width:"100%",
              margin:"0 auto"
            }}
            onClick={()=>setOpen(open===i?null:i)}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:26}}>{tip.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:14,color:tip.tc}}>{tip.title}</div>
                <div style={{fontSize:11,color:"var(--s500)",marginTop:2}}>{tip.items.length} {lang==="en"?"tips":"inama"}</div>
              </div>
              <span style={{fontSize:18,color:tip.tc}}>{open===i?"▲":"▼"}</span>
            </div>
            {open===i && (
              <div className="tip-body">
                {tip.items.map((item,j)=>(
                  <div key={j} style={{display:"flex",gap:8,marginBottom:7,fontSize:13,color:"var(--s700)",lineHeight:1.5}}>
                    <span style={{fontSize:10,marginTop:4,color:tip.tc,flexShrink:0}}>●</span>{item}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
function ProfileScreen({user,onNavigate,onLogout,lang,setLang}) {
  const t = T[lang];
  const initials = user.name ? user.name.split(' ').map(n=>n[0]).join('').toUpperCase() : "F";
  
  const stats = [
    { icon: (<i className="bi bi-geo-alt"></i>), label: t.sector, val: user.sector },
    { icon: (<i className="bi bi-rulers"></i>), label: lang==="en" ? "Land Size" : "Ubuso", val: `${user.farm_size_ha||0} ha` }
  ];

  return (
    <>
      <Topbar title={(<><i className="bi bi-person"></i> {t.myProfile}</>)} onBack={()=>onNavigate("dashboard")} lang={lang} setLang={setLang}/>
      <div className="scroll fade-up">
        
        {/* Premium Header */}
        <div className="p-header">
          <div className="p-avatar-wrap">{initials}</div>
          <div className="p-name">{user.name}</div>
          <div className="p-id-badge">{t.farmerId}: {user.id}</div>
        </div>

        {/* Quick Stats Grid */}
        <div className="p-stat-grid">
          {stats.map(s => (
            <div key={s.label} className="p-stat-card">
              <span className="p-stat-icon">{s.icon}</span>
              <span className="p-stat-val">{s.val}</span>
              <span className="p-stat-lbl">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="p-details-title">{t.personalInfo}</div>
        <div className="card" style={{padding:"20px 24px"}}>
          {[
            {icon: (<i className="bi bi-person"></i>), key: t.name, val: user.name},
            {icon: (<i className="bi bi-envelope"></i>), key: t.emailLabel, val: user.email},
            {icon: (<i className="bi bi-person-badge"></i>), key: t.farmerId, val: user.id},
            {icon: (<i className="bi bi-geo-alt"></i>), key: t.sector, val: user.sector},
            {icon: (<i className="bi bi-rulers"></i>), key: t.farmSizeHa, val: `${user.farm_size_ha||0} ha (${user.farm_size_are||0} are)`}
          ].map((item, idx, arr)=>(
            <div key={item.key} style={{
              display:"flex", 
              justifyContent:"space-between", 
              alignItems:"center",
              padding:"12px 0",
              borderBottom: idx === arr.length - 1 ? "none" : "1px solid var(--s100)"
            }}>
              <div style={{display:"flex", alignItems:"center", gap:14}}>
                <span style={{fontSize:18, width:24}}>{item.icon}</span>
                <span style={{fontSize:13, fontWeight:700, color:"var(--s500)", textTransform:"uppercase", letterSpacing:0.5}}>{item.key}</span>
              </div>
              <span style={{fontSize:15, fontWeight:800, color:"var(--s900)"}}>{item.val}</span>
            </div>
          ))}
        </div>

        <div className="p-details-title">{t.settings}</div>
        <div className="card" style={{padding:0}}>
          {[
            {label: t.editProfile, mode: "edit-profile", icon: (<i className="bi bi-pencil"></i>)},
            {label: t.changePassword, mode: "change-password", icon: (<i className="bi bi-key"></i>)},
            {label: `${t.language} (${lang==="en"?"English":"Kinyarwanda"})`, mode: "language", icon: (<i className="bi bi-globe"></i>)},
            {label: t.aboutApp, mode: "about", icon: "ℹ"}
          ].map((item, idx, arr)=>(
            <div key={item.mode} 
              className="info-row" 
              style={{
                cursor:"pointer", 
                padding:"16px 14px", 
                borderBottom: idx === arr.length-1 ? "none" : "1px solid var(--s100)"
              }} 
              onClick={()=>onNavigate(item.mode)}>
              <div style={{display:"flex", alignItems:"center", gap:12}}>
                <span style={{fontSize:18}}>{item.icon}</span>
                <span style={{fontSize:14, fontWeight:700, color:"var(--s700)"}}>{item.label}</span>
              </div>
              <span style={{color:"var(--s400)"}}>→</span>
            </div>
          ))}
        </div>

        <button className="btn btn-ghost" onClick={onLogout} 
          style={{
            marginTop: 10,
            borderColor:"#ef4444", 
            color:"#ef4444", 
            background: "rgba(239, 68, 68, 0.05)",
            fontWeight: 800
          }}>
          <i className="bi bi-box-arrow-right"></i> {t.logout}
        </button>

      </div>
      <BottomNav current="profile" onNavigate={onNavigate} lang={lang} user={user}/>
    </>
  );
}

// ── EDIT PROFILE ──────────────────────────────────────────────────────────────
function EditProfileScreen({user,onNavigate,setUser,lang,setLang}) {
  const t = T[lang];
  const [name,setName] = useState(user.name);
  const [sector,setSector] = useState(user.sector);
  const [size,setSize] = useState(user.farm_size_ha || 0);
  const [loading,setLoading] = useState(false);
  const [msg,setMsg] = useState({t:"",m:""});

  const handleSave = async () => {
    setLoading(true); setMsg({t:"",m:""});
    try {
      const res = await fetch(`${API_BASE}/api/update-profile`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ user_id: user.id, role:"farmer", name, sector, farm_size_ha: parseFloat(size) })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setMsg({t:"ok", m: lang==="en"?"Profile updated!":"Konti yavuguruwe!"});
        setTimeout(()=>onNavigate("profile"), 1500);
      } else { setMsg({t:"err", m: data.error}); }
    } catch(e) { setMsg({t:"err", m: "Connection error"}); }
    setLoading(false);
  };

  return (
    <>
      <Topbar title={t.editProfile} onBack={()=>onNavigate("dashboard")} lang={lang} setLang={setLang}/>
      <div className="scroll fade-up">
        {msg.m && <div className={`alert alert-${msg.t}`} style={{marginBottom:16}}>{msg.m}</div>}
        <div className="card">
          <div className="fgrp">
            <label className="flabel">{t.fullName}</label>
            <input className="finput" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div className="fgrp">
            <label className="flabel">{t.sector}</label>
            <select className="finput" value={sector} onChange={e=>setSector(e.target.value)}>
              {SECTORS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="fgrp">
            <label className="flabel">{t.farmSizeHa}</label>
            <input className="finput" type="number" step="0.1" value={size} onChange={e=>setSize(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{marginTop:10}}>
            {loading ? <div className="spin"/> : (lang==="en"?"Save Changes":"Bika Impinduka")}
          </button>
        </div>
      </div>
    </>
  );
}

// ── CHANGE PASSWORD ───────────────────────────────────────────────────────────
function ChangePasswordScreen({user,onNavigate,lang,setLang}) {
  const t = T[lang];
  const [oldPw,setOldPw] = useState("");
  const [newPw,setNewPw] = useState("");
  const [confPw,setConfPw] = useState("");
  const [loading,setLoading] = useState(false);
  const [msg,setMsg] = useState({t:"",m:""});

  const handleSave = async () => {
    if(!oldPw || !newPw || !confPw) return setMsg({t:"err", m:t.allRequired});
    if(newPw !== confPw) return setMsg({t:"err", m:t.pwMismatch});
    setLoading(true); setMsg({t:"",m:""});
    try {
      const res = await fetch(`${API_BASE}/api/change-password`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ user_id: user.id, role:"farmer", old_password: oldPw, new_password: newPw })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({t:"ok", m: lang==="en"?"Password changed!":"Ijambo ry'ibanga ryahinduwe!"});
        setTimeout(()=>onNavigate("profile"), 1500);
      } else { setMsg({t:"err", m: data.error}); }
    } catch(e) { setMsg({t:"err", m: "Connection error"}); }
    setLoading(false);
  };

  return (
    <>
      <Topbar title={t.changePassword} onBack={()=>onNavigate("profile")} lang={lang} setLang={setLang}/>
      <div className="scroll fade-up">
        {msg.m && <div className={`alert alert-${msg.t}`} style={{marginBottom:16}}>{msg.m}</div>}
        <div className="card">
          <div className="fgrp">
            <label className="flabel">{lang==="en"?"Current Password":"Ijambo ry'ibanga ririho"}</label>
            <input className="finput" type="password" value={oldPw} onChange={e=>setOldPw(e.target.value)} />
          </div>
          <div className="fgrp">
            <label className="flabel">{lang==="en"?"New Password":"Ijambo ry'ibanga rishya"}</label>
            <input className="finput" type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} />
          </div>
          <div className="fgrp">
            <label className="flabel">{t.confirmPw}</label>
            <input className="finput" type="password" value={confPw} onChange={e=>setConfPw(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{marginTop:10}}>
            {loading ? <div className="spin"/> : (lang==="en"?"Update Password":"Hindura Ijambo ry'ibanga")}
          </button>
        </div>
      </div>
    </>
  );
}

// ── LANGUAGE SELECTION ────────────────────────────────────────────────────────
function LanguageScreen({onNavigate,lang,setLang}) {
  const t = T[lang];
  return (
    <>
      <Topbar title={t.language} onBack={()=>onNavigate("profile")} lang={lang} setLang={setLang}/>
      <div className="scroll fade-up">
        <div className="card">
          <div className="sec-hd" style={{marginBottom:14}}>{lang==="en"?"Select Language":"Hitamo Ururimi"}</div>
          {[["English","en",""],["Kinyarwanda","rw",""]].map(([lbl,code,icon])=>(
            <div key={code} className="info-row" style={{padding:"16px 12px", borderBottom: code==="en"?"1px solid var(--s100)":"none", cursor:"pointer", background:lang===code?"var(--g50)":"white"}}
              onClick={()=>{setLang(code); setTimeout(()=>onNavigate("profile"), 500);}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:24}}>{icon}</span>
                <span style={{fontWeight:700,color:lang===code?"var(--g800)":"var(--s700)"}}>{lbl}</span>
              </div>
              {lang===code && <span style={{color:"var(--g600)",fontWeight:800}}><i className="bi bi-check"></i></span>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── ABOUT APP ─────────────────────────────────────────────────────────────────
function AboutAppScreen({onNavigate,lang,setLang}) {
  const t = T[lang];
  return (
    <>
      <Topbar title={t.aboutApp} onBack={()=>onNavigate("profile")} lang={lang} setLang={setLang}/>
      <div className="scroll fade-up">
        <div style={{textAlign:"center",padding:"30px 20px"}}>
          <div style={{fontSize:60,marginBottom:16}}><i className="bi bi-tree"></i></div>
          <div style={{fontSize:24,fontWeight:800,color:"var(--g900)"}}>{t.appName}</div>
          <div style={{fontSize:14,color:"var(--s500)",marginTop:4}}>Version 4.0.2-Stable</div>
          <div style={{fontSize:13,color:"var(--s600)",marginTop:20,lineHeight:1.6}}>
            {lang==="en" 
              ? "Bugesera Harvest Predictor is a smart farming solution designed to help farmers in Rwanda optimize their yields through high-precision AI models and historical climate analysis."
              : "Sisitemu yo gusesengura imyaka mu Karere ka Bugesera ni igisubizo cy'ubuhinzi bw'ubwenge kigamije gufasha abahinzi b'u Rwanda kongera umusaruro binyuze mu gusesengura imiterere y'ikirere."}
          </div>
        </div>
        <div className="card">
          <div className="sec-hd" style={{marginBottom:12}}>{lang==="en"?"Development Team":"Ikipe yakoze App"}</div>
          <div className="info-row">
            <span className="info-key">{lang==="en"?"Lead Developer":"Umushinga"}</span>
            <span className="info-val">Cesalie UWIMPUHWE</span>
          </div>
          <div className="info-row">
            <span className="info-key">Institution</span>
            <span className="info-val">Rwanda Polytechnic</span>
          </div>
          <div className="info-row">
            <span className="info-key">Location</span>
            <span className="info-val">Kigali, Rwanda</span>
          </div>
        </div>
        <div style={{textAlign:"center",padding:20,fontSize:11,color:"var(--s400)"}}>
          © 2026 {t.appName} Project. All Rights Reserved.
        </div>
      </div>
    </>
  );
}

function FarmerDetailView({farmerId, onBack, lang, setLang, setSelectedPred, officer}) {
  const t = T[lang];
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/farmer-stats/${farmerId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [farmerId]);

  const [showAdviceForm, setShowAdviceForm] = useState(false);
  const [adviceMsg, setAdviceMsg] = useState("");
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  if (loading) return <div style={{textAlign:"center",padding:40}}><div className="spin" style={{margin:"0 auto 10px"}}/>Loading farmer data…</div>;
  if (!data || data.error) return <div className="alert alert-err">{data?.error || "Farmer not found"}</div>;

  const f = data.farmer;
  const stats = data.stats || {};
  const preds = data.recent_predictions || [];

  return (
    <div className="fade-up">
      <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:16}}>
        <button className="back-icon" onClick={onBack}>←</button>
        <div className="sec-hd" style={{margin:0}}><i className="bi bi-person"></i> {t.farmerProfile}</div>
      </div>

      {/* Header Card */}
      <div className="p-header" style={{marginBottom:16}}>
        <div className="p-avatar-wrap">{f.full_name ? f.full_name.split(' ').map(n=>n[0]).join('').toUpperCase() : "F"}</div>
        <div className="p-name" style={{color:"white"}}>{f.full_name}</div>
        <div className="p-id-badge" style={{color:"white", borderColor:"rgba(255,255,255,0.4)"}}>{f.farmer_id}</div>
      </div>

      <div className="p-stat-grid">
        <div className="p-stat-card">
          <span className="p-stat-icon"><i className="bi bi-bar-chart-line"></i></span>
          <span className="p-stat-val">{preds.length}</span>
          <span className="p-stat-lbl">{t.totalPredictions}</span>
        </div>
        <div className="p-stat-card">
          <span className="p-stat-icon"><i className="bi bi-geo-alt"></i></span>
          <span className="p-stat-val">{f.sector_name || "N/A"}</span>
          <span className="p-stat-lbl">{t.sector}</span>
        </div>
        <div className="p-stat-card">
          <span className="p-stat-icon"><i className="bi bi-rulers"></i></span>
          <span className="p-stat-val">{f.farm_size_are || 0} are</span>
          <span className="p-stat-lbl">Land Size</span>
        </div>
      </div>

      {/* Contact & Personal */}
      <div className="p-details-title">Detailed Information</div>
      <div className="card" style={{padding:"16px 20px"}}>
        {[
          {lbl: t.phoneLabel, val: f.phone_number},
          {lbl: "Category", val: f.farmer_category || "Small"},
          {lbl: "Registered At", val: new Date(f.created_at).toLocaleDateString()},
        ].map(item => (
          <div key={item.lbl} style={{display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--s100)"}}>
            <span style={{fontSize:13, fontWeight:700, color:"var(--s500)"}}>{item.lbl}</span>
            <span style={{fontSize:14, fontWeight:800, color:"var(--s900)"}}>{item.val}</span>
          </div>
        ))}
      </div>

      {/* History Table */}
      <div className="p-details-title" style={{marginTop:20}}><i className="bi bi-clipboard-data"></i> Prediction History</div>
      <div className="card" style={{padding:0, overflow:"hidden"}}>
        {preds.length === 0 ? (
          <div style={{padding:30, textAlign:"center", color:"var(--s400)"}}>No history recorded yet.</div>
        ) : (
          <table style={{width: "100%", borderCollapse: "collapse", fontSize: 13}}>
            <thead>
              <tr style={{background:"var(--s50)", textAlign:"left"}}>
                <th style={{padding:"12px 14px", color:"var(--s600)"}}>Crop</th>
                <th style={{padding:"12px 14px", color:"var(--s600)"}}>Yield (kg/a)</th>
                <th style={{padding:"12px 14px", color:"var(--s600)"}}>Date</th>
                <th style={{padding:"12px 14px", color:"var(--s600)"}}>Grade</th>
              </tr>
            </thead>
            <tbody>
              {preds.map((p, i) => (
                <tr key={i} style={{borderTop:"1px solid var(--s100)", cursor:"pointer"}} onClick={() => setSelectedPred && setSelectedPred(p)}>
                  <td style={{padding:"12px 14px", fontWeight:700}}>{CROP_ICON[p.crop_type] || (<i className="bi bi-flower2"></i>)} {p.crop_type}</td>
                  <td style={{padding:"12px 14px", fontFamily:"JetBrains Mono"}}>{parseFloat(p.yield_per_are_kg).toFixed(1)}</td>
                  <td style={{padding:"12px 14px", color:"var(--s500)"}}>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td style={{padding:"12px 14px"}}>
                    <span className="badge bg-green" style={{background:"rgba(16, 185, 129, 0.1)", color:"#059669", fontSize:10, textTransform:"capitalize"}}>{p.yield_grade || "Good"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdviceForm ? (
        <div className="card fade-up" style={{marginTop:20, background:"var(--g50)"}}>
          <div style={{fontWeight:800, marginBottom:10, fontSize:14}}>Direct Advice to {f.full_name}</div>
          {status && <div className={`alert alert-${status.type}`} style={{marginBottom:12, fontSize:12}}>{status.msg}</div>}
          <textarea 
            className="finput" 
            placeholder="Type your advice here..." 
            rows={3}
            value={adviceMsg}
            onChange={e=>setAdviceMsg(e.target.value)}
          />
          <div style={{display:"flex", gap:10, marginTop:12}}>
            <button className="btn btn-primary" style={{flex:2}} onClick={async ()=>{
              if(!adviceMsg.trim()) return;
              setSending(true);
              try {
                const res = await fetch(`${API_BASE}/api/send-advice`, {
                  method:"POST", headers:{"Content-Type":"application/json"},
                  body: JSON.stringify({
                    officer_id: officer.id,
                    farmer_id: f.farmer_id,
                    message: adviceMsg,
                    advice_type: "direct"
                  })
                });
                const data = await res.json();
                if(data.success) {
                  setStatus({type:"ok", msg:"Advice sent!"});
                  setAdviceMsg("");
                  setTimeout(()=>{ setShowAdviceForm(false); setStatus(null); }, 2000);
                } else { setStatus({type:"err", msg:data.error}); }
              } catch(e) { setStatus({type:"err", msg:"Connection error"}); }
              setSending(false);
            }} disabled={sending || !adviceMsg.trim()}>
              {sending ? <div className="spin"/> : <><i className="bi bi-send"></i> Send</>}
            </button>
            <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setShowAdviceForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary" style={{marginTop:20, background:"var(--g700)"}} 
          onClick={() => setShowAdviceForm(true)}>
          <i className="bi bi-chat-dots"></i> Send Advice to {f.full_name?.split(' ')[0]}
        </button>
      )}
    </div>
  );
}

const fmtDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val; // Return original if parse fails
  return d.toLocaleDateString("en-RW", {day:"numeric",month:"short",year:"numeric"});
};

function PredictionDetailView({prediction, onBack, lang, user, onUpdate}) {
  const t = T[lang];
  const p = prediction;
  const [actualYield, setActualYield] = useState(p.actual_yield_kg_are || "");
  const [harvestDate, setHarvestDate] = useState(p.actual_harvest_date || new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSaveActual = async () => {
    if (!actualYield) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/predictions/record-actual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prediction_id: p.prediction_id || p.id,
          actual_yield: actualYield,
          harvest_date: harvestDate
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: "ok", msg: "Harvest recorded!" });
        if (onUpdate) onUpdate({ ...p, actual_yield_kg_are: actualYield, actual_harvest_date: harvestDate });
      } else {
        setStatus({ type: "err", msg: data.error });
      }
    } catch (e) {
      setStatus({ type: "err", msg: "Connection error" });
    }
    setSaving(false);
  };
  
  return (
    <div className="fade-up">
      <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:16}}>
        <button className="back-icon" onClick={onBack}>←</button>
        <div className="sec-hd" style={{margin:0}}><i className="bi bi-file-earmark-text"></i> Prediction Details</div>
      </div>

      <div className="card card-hero" style={{marginBottom:16}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <div style={{fontSize:12, opacity:0.8}}>Prediction ID</div>
            <div style={{fontSize:16, fontWeight:800, fontFamily:"JetBrains Mono"}}>{p.prediction_id || p.id}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12, opacity:0.8}}>Date</div>
            <div style={{fontSize:16, fontWeight:700}}>{fmtDate(p.timestamp || p.created_at)}</div>
          </div>
        </div>
      </div>

      <div className="stat-grid" style={{marginBottom:16}}>
        {[
          {icon: CROP_ICON[p.crop || p.crop_type]||(<i className="bi bi-flower2"></i>), val: p.crop || p.crop_type, lbl: "Estimated Crop"},
          {icon: (<i className="bi bi-rulers"></i>), val: `${p.area_planted_are} are`, lbl: "Area Planted"},
          {icon: (<i className="bi bi-tree"></i>), val: `${p.yield_per_are_kg} kg/are`, lbl: "Predicted Yield"},
          {icon: (<i className="bi bi-cash-stack"></i>), val: `${p.total_yield_kg} kg`, lbl: "Total Harvest"}
        ].map(item => (
          <div key={item.lbl} className="stat-box">
             <div style={{fontSize:24}}>{item.icon}</div>
             <div className="stat-val" style={{fontSize:16}}>{item.val}</div>
             <div className="stat-lbl">{item.lbl}</div>
          </div>
        ))}
      </div>

      {/* Actual Harvest Form (Officer Only) */}
      {(user?.role === "officer" || user?.role === "sector" || user?.role === "district") && (
        <div className="card" style={{marginBottom:16, border:"2px solid var(--g300)", background:"var(--g50)"}}>
          <div className="sec-hd" style={{color:"var(--g800)"}}><i className="bi bi-check2-square"></i> Record Actual Harvest Result</div>
          {status && <div className={`alert alert-${status.type}`} style={{marginBottom:12, fontSize:12}}>{status.msg}</div>}
          <div className="frow">
            <div className="fgrp">
              <label className="flabel">Actual Yield (kg/are)</label>
              <input className="finput" type="number" step="0.1" value={actualYield} onChange={e=>setActualYield(e.target.value)} placeholder="e.g. 24.5" />
            </div>
            <div className="fgrp">
              <label className="flabel">Harvest Date</label>
              <input className="finput" type="date" value={harvestDate} onChange={e=>setHarvestDate(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleSaveActual} disabled={saving || !actualYield} style={{marginTop:8}}>
            {saving ? <div className="spin"/> : <><i className="bi bi-save"></i> Save Actual Result</>}
          </button>
          
          {p.actual_yield_kg_are && (
            <div style={{marginTop:15, paddingTop:15, borderTop:"1px solid var(--g200)", display:"flex", alignItems:"center", gap:15}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11, color:"var(--s500)", textTransform:"uppercase"}}>Accuracy Gap</div>
                <div style={{fontSize:18, fontWeight:800, color: Math.abs(p.yield_per_are_kg - p.actual_yield_kg_are) < 2 ? "var(--g600)" : "var(--red)"}}>
                  {Math.abs(p.yield_per_are_kg - p.actual_yield_kg_are).toFixed(2)} kg/are 
                  <span style={{fontSize:12, fontWeight:500, marginLeft:6}}>({((1 - Math.abs(p.yield_per_are_kg - p.actual_yield_kg_are)/p.yield_per_are_kg)*100).toFixed(1)}% Accuracy)</span>
                </div>
              </div>
              <div style={{fontSize:30, color: Math.abs(p.yield_per_are_kg - p.actual_yield_kg_are) < 2 ? "var(--g500)" : "var(--amber)"}}>
                <i className={Math.abs(p.yield_per_are_kg - p.actual_yield_kg_are) < 2 ? "bi bi-check-circle" : "bi bi-exclamation-triangle"}></i>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inputs Overview */}
      <div className="p-details-title">Agricultural Inputs</div>
      <div className="card" style={{padding:"16px 20px", marginBottom:16}}>
        {[
          {lbl: "Target Crop", val: p.crop || p.crop_type},
          {lbl: "Sector Location", val: p.sector},
          {lbl: "Growing Season", val: p.season},
          {lbl: "Soil Type", val: p.soil_type || "N/A"},
          {lbl: "Fertilizer Applied", val: p.fertilizer_used ? "Yes" : "No"},
          {lbl: "Irrigation Support", val: p.irrigation_used ? "Yes" : "No"},
          {lbl: "Previous Crop", val: p.previous_crop || "None"}
        ].map(item => (
          <div key={item.lbl} style={{display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--s100)"}}>
            <span style={{fontSize:13, color:"var(--s500)"}}>{item.lbl}</span>
            <span style={{fontSize:14, fontWeight:700, color:"var(--s900)"}}>{item.val}</span>
          </div>
        ))}
      </div>

      {/* Climate Data */}
      <div className="p-details-title">Climate Variables (at planting)</div>
      <div className="card" style={{padding:"16px 20px", marginBottom:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
         {[
           {lbl: "Temp", val: `${p.temperature||p.avg_temperature||"-"}°C`},
           {lbl: "Rainfall", val: `${p.rainfall||p.total_rainfall_mm||"-"}mm`},
           {lbl: "Humidity", val: `${p.humidity||p.humidity_pct||"-"}%`},
           {lbl: "Sunshine", val: `${p.sunshine||p.sunshine_hrs||"-"}h`}
         ].map(item => (
           <div key={item.lbl}>
              <div style={{fontSize:11, color:"var(--s500)", textTransform:"uppercase"}}>{item.lbl}</div>
              <div style={{fontSize:15, fontWeight:800}}>{item.val}</div>
           </div>
         ))}
      </div>

      {/* Recommendations */}
      <div className="p-details-title">System Recommendations</div>
      <div className="card" style={{padding:"16px 20px"}}>
        {p.recommendations ? (
          <div style={{fontSize:14, lineHeight:1.6, color:"var(--s700)"}}>
            {typeof p.recommendations === 'string' ? p.recommendations : (Array.isArray(p.recommendations) ? p.recommendations.map(r=>r.message).join(" ") : JSON.stringify(p.recommendations))}
          </div>
        ) : (
          <div style={{fontSize:14, color:"var(--s400)", fontStyle:"italic"}}>Standard optimized practices for {p.crop} were generated for this result.</div>
        )}
      </div>
    </div>
  );
}

// ── OFFICER DASHBOARD ─────────────────────────────────────────────────────────
function AdminPanel({lang, user}) {
  const t = T[lang];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("sector");
  const [sector, setSector] = useState(SECTORS[0]);
  const [dept, setDept] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [officers, setOfficers] = useState([]);

  useEffect(() => {
    fetchOfficers();
  }, []);

  const fetchOfficers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/officers`);
      const data = await res.json();
      if (data.success) setOfficers(data.officers);
    } catch (e) {}
  };

  const handleRegister = async () => {
    if (!name || !email || !dept) return setStatus({type:"err", msg: t.allRequired});
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, role, sector, department: dept })
      });
      const data = await res.json();
      if (data.success) {
        setStatus({type:"ok", msg: t.officerRegistered});
        setName(""); setEmail(""); setPhone(""); setDept("");
        fetchOfficers();
      } else {
        setStatus({type:"err", msg: data.error});
      }
    } catch (e) { setStatus({type:"err", msg: "Connection failed"}); }
    setLoading(false);
  };

  return (
    <div className="fade-up" style={{paddingBottom: 40}}>
      <div className="sec-hd"><i className="bi bi-person-plus"></i> {t.registerOfficer}</div>
      <div className="card">
        {status && (
          <div className={`rec ${status.type==="ok"?"rec-success":"rec-warning"}`} style={{marginBottom:15}}>
             <div className="rec-cat">{status.type==="ok"?"Success":"Error"}</div>
             <div className="rec-text">{status.msg}</div>
          </div>
        )}
        <div className="frow">
          <div className="fgrp">
            <label className="flabel">{t.fullName}</label>
            <input className="finput" value={name} onChange={e=>setName(e.target.value)} placeholder="Full Name" />
          </div>
          <div className="fgrp">
            <label className="flabel">{t.emailLabel || "Email"}</label>
            <input className="finput" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
        </div>
        <div className="frow">
          <div className="fgrp">
            <label className="flabel">{t.phoneReg}</label>
            <input className="finput" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="078..." />
          </div>
          <div className="fgrp">
            <label className="flabel">{t.deptLabel}</label>
            <input className="finput" value={dept} onChange={e=>setDept(e.target.value)} placeholder="e.g. Irrigation" />
          </div>
        </div>
        <div className="frow">
          <div className="fgrp">
            <label className="flabel">{t.officerRole}</label>
            <select className="finput" value={role} onChange={e=>setRole(e.target.value)}>
              <option value="sector">Sector Officer</option>
              <option value="district">District Officer</option>
            </select>
          </div>
          {role === 'sector' && (
            <div className="fgrp">
              <label className="flabel">{t.assignedSector}</label>
              <select className="finput" value={sector} onChange={e=>setSector(e.target.value)}>
                {SECTORS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>
        <button className="btn btn-primary" onClick={handleRegister} disabled={loading} style={{marginTop: 10}}>
          {loading ? <div className="spin"/> : t.registerTab}
        </button>
      </div>

      <div className="sec-hd" style={{marginTop:30}}><i className="bi bi-people"></i> {t.existingOfficers}</div>
      <div className="card" style={{padding:0, overflow:"hidden"}}>
        <div style={{overflowX: 'auto'}}>
          <table style={{width:"100%", borderCollapse:"collapse", fontSize:13, minWidth: 500}}>
            <thead style={{background:"var(--s100)", textAlign:"left"}}>
              <tr>
                <th style={{padding:12}}>Name</th>
                <th style={{padding:12}}>Role</th>
                <th style={{padding:12}}>Sector/Dept</th>
                <th style={{padding:12}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {officers.map(o => (
                <tr key={o.id} style={{borderTop:"1px solid var(--s200)"}}>
                  <td style={{padding:12, fontWeight:700}}>
                    {o.name}
                    <div style={{fontSize:10, fontWeight:400, color:"var(--s400)"}}>{o.email}</div>
                  </td>
                  <td style={{padding:12, textTransform:"capitalize"}}>{o.role}</td>
                  <td style={{padding:12}}>{o.role==='sector'?o.sector:o.department}</td>
                  <td style={{padding:12}}><span className="badge bg-green">Active</span></td>
                </tr>
              ))}
              {officers.length === 0 && (
                <tr>
                  <td colSpan={4} style={{padding:40, textAlign:"center", color:"var(--s400)"}}>
                    <i className="bi bi-inbox" style={{fontSize: 24, display: 'block', marginBottom: 8}}></i>
                    No officers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function OfficerApp({user,onLogout,lang,setLang}) {
  const t = T[lang];
  const [tab,setTab]           = useState("overview");
  const [dashData,setDashData] = useState(null);
  const [loading,setLoading]   = useState(true);
  const [selectedFarmerId, setSelectedFarmerId] = useState(null);
  const [selectedPred, setSelectedPred]         = useState(null);
  const [targetGroup, setTargetGroup]           = useState("All Farmers");
  const [adviceMsg, setAdviceMsg]               = useState("");
  const [adviceStatus, setAdviceStatus]         = useState(null);
  const [reports, setReports]                   = useState([]);
  const [selectedReport, setSelectedReport]     = useState(null);
  const [selectedSectorId, setSelectedSectorId] = useState(null);
  const [sectorData, setSectorData]             = useState(null);
  const [loadingSector, setLoadingSector]       = useState(false);
  const [reportTitle, setReportTitle]           = useState("");
  const [reportContent, setReportContent]       = useState("");
  const [submitStatus, setSubmitStatus]         = useState(null);
  const [underperforming, setUnderperforming]   = useState([]);

  const fetchUnderperforming = async () => {
    const sectorParam = user.role === 'sector' ? `?sector_id=${user.sector_id || SECTORS.indexOf(user.sector)+1}` : '';
    try {
      const res = await fetch(`${API_BASE}/api/officer/underperforming-farms${sectorParam}`);
      const data = await res.json();
      if (data.success) setUnderperforming(data.farms);
    } catch (e) {}
  };

  useEffect(()=>{
    const sectorParam = user.role === 'sector' ? `?sector=${user.sector}` : '';
    fetch(`${API_BASE}/api/officer-dashboard${sectorParam}`)
      .then(r=>r.json())
      .then(d=>{ setDashData(d); setLoading(false); })
      .catch(()=>setLoading(false));
    
    // If sector officer, automatically load their sector details and set selection
    if (user.role === 'sector') {
       let sid = user.sector_id;
       if (!sid && user.sector) {
          // Fallback: find ID from SECTORS array (1-indexed)
          const idx = SECTORS.indexOf(user.sector);
          if (idx !== -1) sid = idx + 1;
       }
       if (sid) {
          setSelectedSectorId(sid);
          fetchSectorDetails(sid);
       }
    }
    
    fetchReports();
    fetchUnderperforming();
  },[user.id, user.role, user.sector]);

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reports?officer_id=${user.id}&role=district`);
      const data = await res.json();
      if (data.success) setReports(data.reports);
    } catch (e) {}
  };

  const fetchSectorDetails = async (sid) => {
    setLoadingSector(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/sector-details/${sid}`);
      const data = await res.json();
      if (data.success) {
        setSectorData(data.data);
        setSelectedSectorId(sid);
      }
    } catch (e) {}
    setLoadingSector(false);
  };

  const CROP_YIELDS = {Maize:23.22,Beans:11.91,Rice:36.36};
  const sectorYields = [487,423,511,398,456,512,389,443];
  const maxY = Math.max(...sectorYields);

  return (
    <div className="web-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><i className="bi bi-building"></i></div>
          <div className="sidebar-logo-name">{user.role==="district"?"District Level":(user.role==="sector"?"Sector Level":t.districtDash)}</div>
          <div className="sidebar-logo-sub">{user.role==="district"?"District Admin · Bugesera":(user.role==="sector" ? `${user.sector} Sector` : t.officerView)}</div>
        </div>
        <nav className="sidebar-nav">
          <div className="sn-section">Dashboard</div>
          {[[t.overview,"overview",(<i className="bi bi-bar-chart-line"></i>)],[user.role==="sector"?"Farmers":t.sectorsTab,"sectors",(<i className="bi bi-geo-alt"></i>)],[t.reportsTab,"reports",(<i className="bi bi-file-earmark-text"></i>)], (user.role==="district"?[t.registerTab,"admin",(<i className="bi bi-person-plus"></i>)]:null)].filter(Boolean).map(([label,key,icon])=>(
            <button key={key} className={`sn-item ${tab===key?"act":""}`} onClick={()=>{setTab(key); if(user.role==='district') setSelectedSectorId(null);}}>
              <span className="sn-icon">{icon}</span>
              <span className="sn-label">{label}</span>
              {tab===key && <span className="sn-badge">●</span>}
            </button>
          ))}
          <div className="sn-section" style={{marginTop:8}}>Account</div>
          <button className="sn-item" onClick={()=>setLang(l=>l==="en"?"rw":"en")}>
            <span className="sn-icon">{lang==="en"?"EN":"RW"}</span>
            <span className="sn-label">{lang==="en"?"Kinyarwanda":"English"}</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={onLogout}>
            <div className="sidebar-avatar"><i className="bi bi-building"></i></div>
            <div style={{flex:1,minWidth:0}}>
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role"><i className="bi bi-box-arrow-right"></i> {t.logout}</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-content">
        <div className="shell">
          <div className="topbar">
            <div className="back-row">
              <div>
                <div className="topbar-brand"><i className="bi bi-building"></i> {user.role==="district"?"District Admin Dashboard":"Sector Admin Dashboard"}</div>
                <div className="topbar-sub">{user.role==="district"?"District Administration · Bugesera":`${user.sector} Sector · Officer View`}</div>
              </div>
            </div>
            <div className="topbar-actions">
              <LangBtn lang={lang} setLang={setLang}/>
              <button className="tb-btn" onClick={onLogout} title={t.logout}><i className="bi bi-box-arrow-right"></i></button>
            </div>
          </div>
          <div className="scroll fade-up">
            <div className="officer-chip"><i className="bi bi-building"></i> {user.role==="district"?"District Agri Officer":t.officer} · {user.name}</div>
            
            {/* Conditional Detail Views */}
            {selectedPred ? (
              <PredictionDetailView 
                prediction={selectedPred} 
                onBack={() => setSelectedPred(null)} 
                lang={lang} 
              />
            ) : selectedFarmerId ? (
              <FarmerDetailView 
                farmerId={selectedFarmerId} 
                onBack={() => setSelectedFarmerId(null)} 
                lang={lang} 
                setLang={setLang}
                setSelectedPred={setSelectedPred}
                officer={user}
              />
            ) : (
              <>
                <div className="pill-tabs" style={{marginBottom:16}}>
                  {[[t.overview,"overview"],[user.role==="sector"?"Farmers":t.sectorsTab,"sectors"],[t.reportsTab,"reports"],(user.role==="district"?[t.registerTab,"admin"]:null)].filter(Boolean).map(([label,key])=>(
                    <button key={key} className={`pill-tab ${tab===key?"act":""}`} onClick={()=>{setTab(key); if(user.role==='district') setSelectedSectorId(null);}}>{label}</button>
                  ))}
                </div>

                {tab==="overview" && (
                  <>
                    <div className="stat-grid" style={{gridTemplateColumns:"1fr", width:"100%"}}>
                       <div className="stat-box" style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 30px"}}>
                          <div style={{display:"flex", alignItems:"center", gap:15}}>
                             <div style={{fontSize:32, color:"var(--amber)"}}><i className={user.role==="district" ? "bi bi-houses" : "bi bi-people"}></i></div>
                             <div style={{textAlign:"left"}}>
                                <div className="stat-lbl" style={{marginBottom:2}}>{user.role==="district" ? "Total Sectors" : "My Sector Farmers"}</div>
                                <div className="stat-val" style={{fontSize:24}}>{user.role==="district" ? "15 Sectors" : (dashData?.farmer_count || 0) + " Farmers"}</div>
                             </div>
                          </div>
                          <button className="btn btn-primary" style={{width:"auto", padding:"8px 20px"}} onClick={()=>setTab("sectors")}>{user.role==="district" ? "Explore Sectors" : "View Farmers"} <i className="bi bi-arrow-right"></i></button>
                       </div>
                    </div>
                    <div className="sec-hd"><i className="bi bi-tree"></i> {user.role==="district" ? t.districtYield : "Sector Yield Performance"}</div>
                    <div className="card">
                      {Object.entries(dashData?.crop_data||CROP_YIELDS).map(([crop,data])=>{
                        const val = typeof data==="object"?data.avg_yield_kg_are:data;
                        const col = {Maize:"#f59e0b",Beans:"#22c55e",Rice:"#8b5cf6"}[crop]||"#22c55e";
                        return (
                          <div key={crop} className="bar-row">
                            <div className="bar-lbl">{CROP_ICON[crop] ? <i className={"bi " + CROP_ICON[crop]}></i> : null} {crop}</div>
                            <div className="bar-track"><div className="bar-fill" style={{width:`${(val/50)*100}%`,background:col}}/></div>
                            <div className="bar-val">{val?.toFixed?.(1)||val} kg/a</div>
                          </div>
                        );
                      })}
                    </div>
                    {dashData?.recent_preds?.length>0 && (
                      <>
                        <div className="sec-hd"><i className="bi bi-clipboard-data"></i> Recent Predictions</div>
                        {dashData.recent_preds.slice(0,5).map((p,i)=>(
                          <div key={i} className="farmer-row" style={{cursor:"pointer"}} onClick={() => setSelectedPred(p)}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div className="avatar-sm">{CROP_ICON[p.crop] ? <i className={"bi " + CROP_ICON[p.crop]}></i> : <i className="bi bi-flower1"></i>}</div>
                              <div>
                                <div style={{fontWeight:700,fontSize:13}}>{p.farmer_id} — {p.crop}</div>
                                <div style={{fontSize:11,color:"var(--s500)"}}>{p.sector} · {fmtDate(p.timestamp || p.created_at)}</div>
                              </div>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <div style={{fontWeight:800,color:"var(--g700)",fontFamily:"JetBrains Mono,monospace",fontSize:14}}>{p.yield_per_are_kg} kg/are</div>
                              <div style={{fontSize:11,color:"var(--s500)"}}>{p.total_yield_kg} kg total</div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    <div className="sec-hd"><i className="bi bi-calendar-week"></i> {t.seasonPerf}</div>
                    <div className="card">
                      {dashData?.seasons?.length > 0 ? (
                        dashData.seasons.map(s => {
                           const label = s.season === 'Season A' ? "Season A (Oct–Jan)" : "Season B (Mar–Jul)";
                           const note = s.season === 'Season A' ? "Main season — higher yields" : "Secondary season";
                           // Accuracy is just a mock here based on count or fixed 90%
                           const acc = 85 + (Math.min(s.count, 10)); 
                           return (
                             <div key={s.season} style={{marginBottom:14}}>
                               <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                                 <div><div style={{fontWeight:700,fontSize:13}}>{label}</div><div style={{fontSize:11,color:"var(--s500)"}}>{note}</div></div>
                                 <div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:13,color:"var(--g700)"}}>{s.avg_yield} kg/are</div></div>
                               </div>
                               <div className="prog-track"><div className="prog-fill" style={{width:`${acc}%`}}/></div>
                             </div>
                           );
                        })
                      ) : (
                        <div style={{textAlign:"center", padding:10, fontSize:12, color:"var(--s400)"}}>
                          No seasonal data available in database yet.
                        </div>
                      )}
                    </div>
                    {user.role === 'district' && (
                      <>
                        <div className="sec-hd"><i className="bi bi-exclamation-triangle"></i> {t.districtAlerts}</div>
                        {[["high",(<i className="bi bi-circle-fill"></i>),"Drought risk in Rweru & Musenyi — rainfall <35mm for 21 days"],
                          ["med",(<i className="bi bi-circle-fill"></i>),"Fall Armyworm alert — 3 Gashora farms report infestation"],
                          ["low",(<i className="bi bi-circle-fill"></i>),"Rice blast disease risk in Ntarama wetlands"]].map(([sev,icon,msg],i)=>(
                          <div key={i} className="alert" style={{background:sev==="high"?"var(--red-l)":sev==="med"?"var(--amber-l)":"var(--blue-l)",color:sev==="high"?"var(--red-d)":sev==="med"?"var(--amber-d)":"var(--blue-d)",borderLeft:`3px solid ${sev==="high"?"var(--red)":sev==="med"?"var(--amber)":"var(--blue)"}`}}>
                            {icon} {msg}
                          </div>
                        ))}
                      </>
                    )}

                    {underperforming.length > 0 && (
                      <>
                        <div className="sec-hd" style={{marginTop:24, color:"var(--red)"}}><i className="bi bi-flag-fill"></i> Underperforming Farms (Yield Gap &gt; 20%)</div>
                        <div className="card" style={{padding:0, overflow:"hidden", borderColor:"var(--red-l)"}}>
                          {underperforming.map((f, i) => (
                            <div key={i} className="hitem" style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", borderLeft:"4px solid var(--red)", background: i%2===0?"white":"var(--red-l)", cursor:"pointer"}}
                                 onClick={() => setSelectedFarmerId(f.id)}>
                              <div>
                                <div style={{fontWeight:800, fontSize:13, color:"var(--s900)"}}>{f.name}</div>
                                <div style={{fontSize:11, color:"var(--s600)"}}>{f.crop_type} · {f.sector_name}</div>
                              </div>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontWeight:800, color:"var(--red)", fontSize:13}}>-{f.gap_pct}% Gap</div>
                                <div style={{fontSize:10, color:"var(--s500)"}}>{f.actual} / {f.predicted} kg/a</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {tab==="sectors" && (
              <>
                {selectedSectorId ? (
                   <div className="fade-up">
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
                         <div>
                            <div className="topbar-brand"><i className="bi bi-geo-alt"></i> {sectorData?.sector?.sector_name} Sector</div>
                            <div style={{fontSize:12, opacity:0.7}}>{user.role==='sector' ? 'My Sector Management' : 'Detailed view of farming activities'}</div>
                         </div>
                         {user.role === 'district' && (
                           <button className="btn btn-ghost" style={{width:"auto", padding:"6px 15px"}} onClick={()=>setSelectedSectorId(null)}>
                              <i className="bi bi-arrow-left"></i> Back to Sectors
                           </button>
                         )}
                      </div>

                      <div className="stat-grid" style={{gridTemplateColumns:"1fr 1fr", gap:15, marginBottom:20}}>
                         <div className="stat-box">
                            <div className="stat-val" style={{color:"var(--g600)"}}>{sectorData?.farmers?.length || 0}</div>
                            <div className="stat-lbl">Registered Farmers</div>
                         </div>
                         <div className="stat-box">
                            <div className="stat-val" style={{color:"var(--s600)"}}>{sectorData?.predictions?.length || 0}</div>
                            <div className="stat-lbl">Total Predictions</div>
                         </div>
                      </div>

                      <div className="sec-hd"><i className="bi bi-people"></i> Farmers in {sectorData?.sector?.sector_name}</div>
                      <div className="card" style={{marginBottom:25}}>
                         {sectorData?.farmers?.length === 0 ? (
                            <div style={{padding:20, textAlign:"center", color:"var(--s400)"}}>No farmers registered in this sector.</div>
                         ) : (
                            sectorData.farmers.map(f => (
                               <div key={f.id} className="hitem" style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", cursor: "pointer"}} onClick={() => setSelectedFarmerId(f.farmer_id || f.id)}>
                                  <div style={{display:"flex", alignItems:"center", gap:12}}>
                                     <div className="avatar-sm"><i className="bi bi-person"></i></div>
                                     <div>
                                        <div style={{fontWeight:700, fontSize:13}}>{f.full_name || f.name}</div>
                                        <div style={{fontSize:11, color:"var(--s500)"}}>{f.farmer_id || f.id} · {f.email || f.phone}</div>
                                     </div>
                                  </div>
                                  <button className="btn btn-ghost" style={{width:"auto", padding:"4px 10px", fontSize:11}} onClick={(e) => { e.stopPropagation(); setSelectedFarmerId(f.farmer_id || f.id); }}>View Profile</button>
                               </div>
                            ))
                         )}
                      </div>

                      <div className="sec-hd"><i className="bi bi-clipboard-data"></i> Predictions in {sectorData?.sector?.sector_name}</div>
                      <div className="card">
                         {sectorData?.predictions?.length === 0 ? (
                            <div style={{padding:20, textAlign:"center", color:"var(--s400)"}}>No predictions made in this sector yet.</div>
                         ) : (
                            sectorData.predictions.map(p => (
                               <div key={p.prediction_id} className="hitem" style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", cursor:"pointer"}} onClick={() => setSelectedPred(p)}>
                                  <div style={{display:"flex", alignItems:"center", gap:12}}>
                                     <div className="avatar-sm">{CROP_ICON[p.crop_type] ? <i className={"bi " + CROP_ICON[p.crop_type]}></i> : <i className="bi bi-flower1"></i>}</div>
                                     <div>
                                        <div style={{fontWeight:700, fontSize:13}}>{p.farmer_name} — {p.crop_type}</div>
                                        <div style={{fontSize:11, color:"var(--s500)"}}>{fmtDate(p.created_at)}</div>
                                     </div>
                                  </div>
                                  <div style={{textAlign:"right"}}>
                                     <div style={{fontWeight:800, color:"var(--g700)", fontSize:13}}>{p.yield_per_are_kg} kg/a</div>
                                  </div>
                               </div>
                            ))
                         )}
                      </div>
                   </div>
                ) : user.role === 'district' ? (
                  <>
                    <div className="sec-hd"><i className="bi bi-geo-alt"></i> Select a Sector to View Details</div>
                    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:15}}>
                      {SECTORS.map((sec, idx)=>(
                        <div key={sec} className="card hvr" style={{padding:20, cursor:"pointer", transition:"all 0.2s"}} onClick={()=>fetchSectorDetails(idx+1)}>
                          <div style={{display:"flex", alignItems:"center", gap:12}}>
                             <div className="avatar-sm" style={{background:"var(--s50)", color:"var(--s600)"}}><i className="bi bi-geo-alt"></i></div>
                             <div>
                                <div style={{fontWeight:800, fontSize:15}}>{sec}</div>
                                <div style={{fontSize:11, color:"var(--s500)"}}>Drill-down data <i className="bi bi-arrow-right"></i></div>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{textAlign: "center", padding: 50, color: "var(--s400)"}}>
                     <div style={{fontSize: 40, marginBottom: 15}}><i className="bi bi-arrow-repeat spin"></i></div>
                     <div style={{fontWeight: 700}}>Loading {user.sector} Sector Details...</div>
                     <div style={{fontSize: 12, marginTop: 5}}>Please wait while we sync your local data</div>
                  </div>
                )}
              </>
            )}


            {tab==="reports" && (
              <>
                {user.role === 'district' ? (
                  <>
                    <div className="sec-hd"><i className="bi bi-file-earmark-text"></i> {t.generateReport}</div>
                    <div className="card">
                      <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Report Configuration</div>
                      {[["Report Type",["Season Summary","Crop Performance","Risk Assessment","Farmer Statistics"]],
                        ["Period",["Season A 2024","Season B 2024","Full Year 2024"]],
                        ["Sectors",["All Sectors","Selected Sectors"]]].map(([lbl,opts])=>(
                        <div key={lbl} className="fgrp">
                          <label className="flabel">{lbl}</label>
                          <select className="finput"><option value="">Select…</option>{opts.map(o=><option key={o}>{o}</option>)}</select>
                        </div>
                      ))}
                      <button className="btn btn-primary" onClick={()=>{
                        const url = `${API_BASE}/api/generate-district-pdf`;
                        window.open(url, '_blank');
                      }}>{t.generatePDF}</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="sec-hd"><i className="bi bi-file-earmark-arrow-up"></i> Submit Sector Report to District</div>
                    <div className="card">
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
                        <div style={{fontWeight:700,fontSize:14}}>Send Current Status Report</div>
                        <button className="btn btn-ghost" style={{width:"auto", padding:"4px 10px", fontSize:11, borderRadius:6}}
                          onClick={()=>{
                            const total = allPredictions.length;
                            const avg = total > 0 ? (allPredictions.reduce((sum, p) => sum + (p.yield_per_are_kg || 0), 0) / total).toFixed(2) : 0;
                            const crops = [...new Set(allPredictions.map(p => p.crop || p.crop_type))].join(", ");
                            setReportTitle(`${user.sector} Status Report - ${new Date().toLocaleDateString()}`);
                            setReportContent(`Summary of ${total} farmer predictions in ${user.sector} Sector:\n- Total Submissions: ${total}\n- Avg Expected Yield: ${avg} kg/are\n- Crops: ${crops || 'None'}\n\n[Add more details here...]`);
                          }}>
                          <i className="bi bi-magic"></i> Auto-Draft from Data
                        </button>
                      </div>
                      {submitStatus && (
                        <div className={`alert alert-${submitStatus.type}`} style={{marginBottom:15, fontSize:13}}>
                          {submitStatus.msg}
                        </div>
                      )}
                      <div className="fgrp">
                        <label className="flabel">Report Title</label>
                        <input className="finput" placeholder={`e.g. Weekly Status - ${user.sector}`} 
                          value={reportTitle} onChange={e=>setReportTitle(e.target.value)}/>
                      </div>
                      <div className="fgrp">
                        <label className="flabel">Report Content / Findings</label>
                        <textarea className="finput" rows={6} style={{resize:"none"}}
                          placeholder="Describe the current situation or use Auto-Draft above..."
                          value={reportContent} onChange={e=>setReportContent(e.target.value)}/>
                      </div>
                      <button className="btn btn-primary" onClick={async ()=>{
                        if(!reportTitle.trim() || !reportContent.trim()) return alert("Please fill all fields");
                        setSubmitStatus({type:"info", msg:"Submitting report…"});
                        try {
                          const res = await fetch(`${API_BASE}/api/send-report`, {
                            method: "POST", headers:{"Content-Type":"application/json"},
                            body: JSON.stringify({
                              sender_id: user.id,
                              title: reportTitle,
                              content: reportContent,
                              sector_id: user.sector_id,
                              sector_name: user.sector
                            })
                          });
                          const data = await res.json();
                          if(data.success) {
                            setSubmitStatus({type:"ok", msg: "Report submitted successfully to District!"});
                            setReportTitle(""); setReportContent("");
                            setTimeout(()=>setSubmitStatus(null), 3000);
                          } else { setSubmitStatus({type:"err", msg: data.error}); }
                        } catch(e) { setSubmitStatus({type:"err", msg: "Submission failed."}); }
                      }}>Send Report to District <i className="bi bi-send"></i></button>
                    </div>
                  </>
                )}

                {user.role === 'district' && (
                  <>
                    <div className="sec-hd" style={{marginTop:20}}><i className="bi bi-inbox"></i> Sector Reports from Officers</div>
                  </>
                )}
                {selectedReport ? (
                   <div className="card fade-up">
                      <button className="btn btn-ghost" style={{marginBottom:15, width:"auto", padding:"6px 12px", fontSize:12}} onClick={()=>setSelectedReport(null)}>
                        <i className="bi bi-arrow-left"></i> Back to Inbox
                      </button>
                      <div style={{fontWeight:800, fontSize:16, color:"var(--s900)"}}>{selectedReport.title}</div>
                      <div style={{fontSize:11, color:"var(--s500)", margin:"4px 0 16px"}}>From: {selectedReport.sender_name} · {selectedReport.sector_name} · {fmtDate(selectedReport.created_at)}</div>
                      <div style={{whiteSpace:"pre-wrap", fontSize:13, lineHeight:1.6, background:"var(--s50)", padding:15, borderRadius:12, fontFamily:"monospace"}}>
                        {selectedReport.content}
                      </div>
                   </div>
                ) : (
                  <div className="card">
                    {reports.length === 0 ? (
                      <div style={{fontSize:13, color:"var(--s400)", textAlign:"center"}}>No reports received from sectors yet.</div>
                    ) : (
                      reports.map(r => (
                        <div key={r.report_id} className="hitem" style={{display:"flex", justifyContent:"space-between", alignItems:"center"}} onClick={()=>setSelectedReport(r)}>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:700, fontSize:13}}>{r.title}</div>
                            <div style={{fontSize:11, color:"var(--s500)", marginTop:4}}>{r.sender_name} · {r.sector_name} · {fmtDate(r.created_at)}</div>
                          </div>
                          <i className="bi bi-chevron-right" style={{color:"var(--s300)"}}></i>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="sec-hd" style={{marginTop:20}}><i className="bi bi-megaphone"></i> {user.role === 'district' ? t.sendAdvice : `Send Advice to ${user.sector} Farmers`}</div>
                <div className="card" style={{background:"var(--g50)",borderColor:"var(--g300)"}}>
                  <div style={{fontWeight:700,color:"var(--g800)",marginBottom:10}}>{user.role === 'district' ? t.sendAdvice : "Targeted Local Advice"}</div>
                  {adviceStatus && (
                    <div className={`alert alert-${adviceStatus.type}`} style={{marginBottom:12, fontSize:13}}>
                      {adviceStatus.msg}
                    </div>
                  )}
                  <div className="fgrp">
                    <label className="flabel">{t.targetGroup}</label>
                    <select className="finput" value={targetGroup} onChange={e=>setTargetGroup(e.target.value)}>
                      <option>All Farmers</option>
                      <option>Maize Farmers</option>
                      <option>Beans Farmers</option>
                      <option>Rice Farmers</option>
                    </select>
                  </div>
                  <div className="fgrp">
                    <label className="flabel">{t.adviceMessage}</label>
                    <textarea className="finput" rows={3} placeholder="Type farming advice…" style={{resize:"vertical"}}
                      value={adviceMsg} onChange={e=>setAdviceMsg(e.target.value)}/>
                  </div>
                  <button className="btn btn-primary" onClick={async ()=>{
                    if(!adviceMsg.trim()) return alert("Please type a message");
                    setAdviceStatus({type:"info", msg:"Sending…"});
                    try {
                      const res = await fetch(`${API_BASE}/api/send-advice`, {
                        method:"POST", headers:{"Content-Type":"application/json"},
                        body: JSON.stringify({
                          officer_id: user.id,
                          message: adviceMsg,
                          target_group: targetGroup,
                          advice_type: "broadcast"
                        })
                      });
                      const data = await res.json();
                      if(data.success) {
                        setAdviceStatus({type:"ok", msg: lang==="en"?"Advice sent successfully!":"Inama yoherejwe neza!"});
                        setAdviceMsg("");
                        setTimeout(()=>setAdviceStatus(null), 3000);
                      } else {
                        setAdviceStatus({type:"err", msg: data.error});
                      }
                    } catch(e) { setAdviceStatus({type:"err", msg:"Connection error"}); }
                  }}>{t.sendToFarmers}</button>
                </div>
              </>
            )}

            {tab==="admin" && (
              <AdminPanel lang={lang} user={user}/>
            )}
          </div>
          <BottomNav current={tab} onNavigate={setTab} lang={lang} user={user} />
        </div>
      </div>
    </div>
  );
}


// ── MAIN APP ──────────────────────────────────────────────────────────────────
// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --g50:#f0fdf4;--g100:#dcfce7;--g200:#bbf7d0;--g300:#86efac;--g400:#4ade80;
  --g500:#22c55e;--g600:#16a34a;--g700:#15803d;--g800:#166534;--g900:#14532d;
   --s50:#f8fafc;--s100:#f1f5f9;--s200:#e2e8f0;--s300:#cbd5e1;--s400:#64748b;
   --s500:#475569;--s600:#334155;--s700:#1e293b;--s800:#0f172a;--s900:#000000;
  --black: #000000;
  --amber:var(--g500);--amber-l:var(--s100);--amber-d:var(--s600);
  --blue:var(--g600);--blue-l:var(--s50);--blue-d:var(--s700);
  --red:var(--s600);--red-l:var(--s100);--red-d:var(--s800);
  --purple:var(--g700);--purple-l:var(--g100);
  --radius:16px;--radius-sm:10px;--radius-xs:6px;
  --shadow:0 4px 16px rgba(15,23,42,.06);--shadow-md:0 8px 24px rgba(15,23,42,.08);
  --shadow-lg:0 16px 40px rgba(15,23,42,.12);
}
@keyframes spin { 100% { transform: rotate(360deg); } }
.spin { animation: spin 1.2s linear infinite; display: inline-block; }
html,body{height:100%;background:#f0fdf4;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;margin:0;padding:0;color:var(--s900);}
#root{min-height:100vh;display:flex;flex-direction:column;width:100%;max-width:100%;margin:0;padding:0}
.shell{width:100%;flex:1;background:white;overflow:hidden;display:flex;flex-direction:column;position:relative;}
@media(max-width:460px){.shell{border-radius:0;min-height:100vh}}
.topbar{background:linear-gradient(135deg,var(--g800) 0%,var(--g600) 100%);color:white;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;z-index:10;}
.topbar-brand{font-size:17px;font-weight:800;letter-spacing:-.3px}
.topbar-sub{font-size:11px;opacity:.7;font-weight:500;margin-top:1px}
.topbar-actions{display:flex;gap:8px}
.tb-btn{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.18);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;color:white;transition:background .2s;}
.tb-btn:hover{background:rgba(255,255,255,.28)}
.back-row{display:flex;align-items:center;gap:10px;cursor:pointer}
.back-icon{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:15px;border:none;color:white;cursor:pointer;}
.lang-sw{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.15);border-radius:99px;padding:4px 10px;cursor:pointer;border:none;color:white;font-family:'Outfit',sans-serif;font-size:12px;font-weight:700;transition:background .2s;}
.lang-sw:hover{background:rgba(255,255,255,.25)}
.scroll{flex:1;overflow-y:auto;padding:20px;padding-bottom:90px;scrollbar-width:none;width:100% !important;}
.scroll > div, .scroll > button, .scroll > section, .scroll > input, .scroll > select, .scroll > form, .scroll-content {
  max-width: 1000px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  width: 100% !important;
  display: block;
}
.scroll::-webkit-scrollbar{display:none}
.bnav{position:absolute;bottom:0;left:0;right:0;background:white;border-top:1px solid var(--s200);padding:6px 0 10px;display:flex;z-index:20;}
.bn-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;padding:6px 4px;border:none;background:none;font-family:'Outfit',sans-serif;color:var(--s400);transition:color .2s;}
.bn-item.act{color:var(--g600)}
.bn-icon{font-size:22px;line-height:1}.bn-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px}
.bn-dot{width:4px;height:4px;border-radius:50%;background:var(--g500);margin-top:2px;opacity:0}
.bn-item.act .bn-dot{opacity:1}
.card{background:white;border-radius:var(--radius);padding:20px;border:1px solid var(--s200);margin-bottom:16px;box-shadow:var(--shadow);transition:box-shadow .2s;}
.card:hover{box-shadow:var(--shadow-md)}
.card-hero{background:linear-gradient(135deg,var(--g800) 0%,var(--g600) 100%);color:white;border:none}
.card-blue{background:linear-gradient(135deg,var(--blue-d) 0%,var(--blue) 100%);color:white;border:none}
.card-amber{background:linear-gradient(135deg,var(--amber-d) 0%,var(--amber) 100%);color:white;border:none}
.card-purple{background:linear-gradient(135deg,#5b21b6 0%,var(--purple) 100%);color:white;border:none}
.climate-card{background:linear-gradient(135deg,#0c4a6e,#0284c7);color:white;border-radius:var(--radius);padding:18px;margin-bottom:14px;position:relative;overflow:hidden}
.climate-card::before{content:'';position:absolute;right:-8px;top:-8px;font-size:72px;opacity:.08}
.climate-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.18);border-radius:99px;padding:3px 10px;font-size:11px;font-weight:700;margin-bottom:10px}
.climate-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.climate-item{background:rgba(255,255,255,.12);border-radius:10px;padding:9px 6px;text-align:center}
.climate-val{font-size:16px;font-weight:800;font-family:'JetBrains Mono',monospace;line-height:1}
.climate-lbl{font-size:9px;opacity:.8;margin-top:3px;text-transform:uppercase;letter-spacing:.4px}
.climate-pending{background:rgba(3,105,161,.1);border:2px dashed rgba(3,105,161,.3);border-radius:var(--radius);padding:18px;text-align:center;color:var(--blue-d);margin-bottom:14px}
.flabel{font-size:12px;font-weight:700;color:var(--s500);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px}
.finput{width:100%;padding:12px 14px;border:1.5px solid var(--s200);border-radius:var(--radius-xs);font-family:'Outfit',sans-serif;font-size:14px;background:var(--g50);color:var(--s900);outline:none;transition:border-color .2s,box-shadow .2s;}
.finput:focus{border-color:var(--g500);box-shadow:0 0 0 3px rgba(34,197,94,.12)}
.finput::placeholder{color:var(--s400)}
.frow{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
.fgrp{margin-bottom:14px}
.hint{font-size:11px;color:var(--g700);margin-top:4px;font-weight:600}
.hint-gray{font-size:11px;color:var(--s400);margin-top:3px}
.btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px;border:none;border-radius:var(--radius-sm);font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all .2s;}
.btn-primary{background:linear-gradient(135deg,var(--g700),var(--g500));color:white;box-shadow:0 4px 18px rgba(22,163,74,.3)}
.btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 22px rgba(22,163,74,.4)}
.btn-primary:disabled{opacity:.6;cursor:not-allowed}
.btn-outline{background:white;color:var(--g700);border:2px solid var(--g600)}
.btn-ghost{background:var(--s100);color:var(--s700);border:1.5px solid var(--s200)}
.badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:700}
.bg-green{background:var(--g100);color:var(--g800)}
.bg-amber{background:var(--amber-l);color:var(--amber-d)}
.bg-blue{background:var(--blue-l);color:var(--blue-d)}
.bg-red{background:var(--red-l);color:var(--red-d)}
.bg-purple{background:var(--purple-l);color:#5b21b6}
.stat-grid{display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;margin-bottom:14px}
.stat-box{background:white;border:1px solid var(--s200);border-radius:var(--radius-sm);padding:15px;text-align:center}
.stat-val{font-size:24px;font-weight:800;color:var(--g600);font-family:'JetBrains Mono',monospace}
.stat-lbl{font-size:11px;color:var(--s500);font-weight:600;margin-top:3px;text-transform:uppercase;letter-spacing:.4px}
.sec-hd{font-size:14px;font-weight:800;color:var(--s900);margin-bottom:12px;display:flex;align-items:center;gap:8px;text-transform:uppercase;letter-spacing:.5px}
.rec{padding:12px 14px;border-radius:var(--radius-xs);margin-bottom:9px;border-left:4px solid}
.rec-success{background:var(--g100);border-color:var(--g600)}
.rec-warning{background:var(--amber-l);border-color:var(--amber)}
.rec-info{background:var(--blue-l);border-color:var(--blue)}
.rec-cat{font-size:11px;font-weight:800;text-transform:uppercase;margin-bottom:3px;letter-spacing:.4px}
.rec-success .rec-cat{color:var(--g800)}.rec-warning .rec-cat{color:var(--amber-d)}.rec-info .rec-cat{color:var(--blue-d)}
.rec-text{font-size:13px;line-height:1.55;color:var(--s700)}
.hitem{background:white;border:1px solid var(--s200);border-radius:var(--radius);padding:14px;margin-bottom:10px;cursor:pointer;transition:box-shadow .2s,transform .15s;}
.hitem:hover{box-shadow:var(--shadow);transform:translateX(2px)}
.hitem-icon{width:44px;height:44px;border-radius:12px;background:var(--g100);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.hitem-yield{font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:700;color:var(--g700);text-align:right}
.prog-track{height:5px;background:var(--s200);border-radius:99px;overflow:hidden;margin-top:10px}
.prog-fill{height:100%;background:linear-gradient(90deg,var(--g700),var(--g400));border-radius:99px;transition:width .6s ease}
.steps-bar{height:4px;background:var(--s200);flex-shrink:0}
.steps-fill{height:100%;background:linear-gradient(90deg,var(--g700),var(--g500));transition:width .4s ease;border-radius:0 4px 4px 0}
.crop-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}
.crop-btn{padding:16px 8px;border-radius:16px;border:2px solid var(--s100);background:rgba(255,255,255,0.7);backdrop-filter:blur(10px);cursor:pointer;text-align:center;transition:all .3s cubic-bezier(0.4, 0, 0.2, 1);font-family:'Outfit',sans-serif;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);}
.crop-btn:hover{border-color:var(--g400);background:white;transform:translateY(-2px);box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);}
.crop-btn.sel{border-color:var(--g600);background:var(--g50);box-shadow:0 10px 15px -3px rgba(22, 163, 74, 0.2);}
.crop-btn-icon{width:40px;height:40px;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;background:white;border:1px solid var(--s100);border-radius:10px;transition:all .3s;}
.crop-btn-icon img{width:28px;height:28px;transition:transform .3s;}
.crop-btn.sel .crop-btn-icon{background:var(--g100);transform:scale(1.1);}
.crop-btn.sel .crop-btn-icon img{transform:scale(1.1);}
.crop-btn-name{font-size:12px;font-weight:800;color:var(--s600);text-transform:uppercase;letter-spacing:.5px;transition:color .3s;}
.crop-btn.sel .crop-btn-name{color:var(--g800)}
.toggle-group{display:flex;gap:8px}
.toggle-opt{flex:1;padding:11px 8px;border:1.5px solid var(--s200);border-radius:var(--radius-xs);background:white;cursor:pointer;text-align:center;font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;color:var(--s600);transition:all .2s;}
.toggle-opt:hover{border-color:var(--g400)}
.toggle-opt.sel{border-color:var(--g600);background:var(--g100);color:var(--g800)}
.auth-wrap{min-height:100vh;background:url('/hero_bg.png') center/cover no-repeat;display:flex;align-items:center;justify-content:center;padding:20px;position:relative;}
.auth-wrap::before{content:'';position:absolute;inset:0;background:linear-gradient(160deg,rgba(15,76,34,0.4) 0%,rgba(34,161,86,0.2) 100%);}
.auth-card{background:rgba(255,255,255,0.88);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.3);border-radius:28px;padding:32px 26px;width:100%;max-width:380px;box-shadow:0 30px 80px rgba(0,0,0,0.35);max-height:92vh;overflow-y:auto;position:relative;z-index:1;}
.auth-card::-webkit-scrollbar{display:none}
.auth-logo{width:70px;height:70px;background:var(--g100);border-radius:22px;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 18px;color:var(--g700);box-shadow:0 8px 24px rgba(22,163,74,.15)}
.auth-title{font-size:24px;font-weight:800;color:var(--g900);text-align:center}
.auth-sub{font-size:12px;color:var(--s500);text-align:center;margin-top:3px;margin-bottom:22px;line-height:1.5}
.role-tabs{display:flex;background:var(--s100);border-radius:12px;padding:4px;gap:4px;margin-bottom:18px}
.role-tab{flex:1;padding:9px;border:none;border-radius:9px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:700;cursor:pointer;background:none;color:var(--s500);transition:all .2s}
.role-tab.act{background:white;color:var(--g700);box-shadow:0 1px 6px rgba(0,0,0,.1)}
.auth-switch{text-align:center;margin-top:16px;font-size:13px;color:var(--s500)}
.auth-switch a{color:var(--g700);font-weight:700;cursor:pointer;text-decoration:underline}
.demo-box{background:var(--g50);border:1px solid var(--g200);border-radius:10px;padding:11px;margin-top:12px;font-size:12px;color:var(--g800);cursor:pointer}
.demo-box code{font-family:'JetBrains Mono',monospace;background:white;padding:2px 5px;border-radius:4px}
.lang-bar{display:flex;justify-content:center;gap:8px;margin-bottom:18px}
.lang-pill{padding:6px 16px;border-radius:99px;border:2px solid var(--s200);background:white;cursor:pointer;font-family:'Outfit',sans-serif;font-size:13px;font-weight:700;color:var(--s500);transition:all .2s;display:flex;align-items:center;gap:6px}
.lang-pill.act{border-color:var(--g600);background:var(--g100);color:var(--g800)}
.result-hero{background:linear-gradient(135deg,var(--g900),var(--g700) 50%,var(--g600));color:white;border-radius:var(--radius);padding:26px;margin-bottom:14px;text-align:center;position:relative;overflow:hidden}
.result-hero::before{content:'';position:absolute;right:-10px;top:-10px;font-size:90px;opacity:.08}
.result-big{font-size:48px;font-weight:800;font-family:'JetBrains Mono',monospace;line-height:1}
.result-unit{font-size:14px;opacity:.8;margin-top:4px}
.result-meta{display:flex;justify-content:center;gap:20px;margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.2)}
.result-meta-item{text-align:center}
.result-meta-val{font-size:17px;font-weight:800;font-family:'JetBrains Mono',monospace}
.result-meta-lbl{font-size:10px;opacity:.75;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
.officer-chip{display:inline-flex;align-items:center;gap:6px;background:#fef3c7;color:#92400e;padding:5px 14px;border-radius:99px;font-size:12px;font-weight:800;margin-bottom:16px;border:1px solid #fde68a}
.bar-row{display:flex;align-items:center;gap:10px;margin-bottom:9px}
.bar-lbl{font-size:12px;width:90px;color:var(--s500);font-weight:600;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar-track{flex:1;height:8px;background:var(--g100);border-radius:99px;overflow:hidden}
.bar-fill{height:100%;background:linear-gradient(90deg,var(--g800),var(--g400));border-radius:99px;transition:width .8s ease}
.bar-val{font-size:12px;font-weight:800;color:var(--g800);width:65px;text-align:right;font-family:'JetBrains Mono',monospace}
.pill-tabs{display:flex;background:var(--s100);border-radius:11px;padding:4px;gap:4px;margin-bottom:16px;flex-shrink:0}
.pill-tab{flex:1;padding:8px 4px;border:none;border-radius:8px;font-family:'Outfit',sans-serif;font-size:11px;font-weight:700;cursor:pointer;background:none;color:var(--s500);transition:all .2s;text-transform:uppercase;letter-spacing:.3px}
.pill-tab.act{background:white;color:var(--g700);box-shadow:0 1px 5px rgba(0,0,0,.1)}
.farmer-row{background:white;border:1px solid var(--s200);border-radius:var(--radius-xs);padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between}
.avatar-sm{width:38px;height:38px;border-radius:50%;background:var(--g100);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.prof-row-lbl{font-size:12px;font-weight:700;color:var(--s500);text-transform:uppercase;letter-spacing:.4px}.prof-row-val{font-size:14px;font-weight:600;color:var(--s800)}
.spin{width:20px;height:20px;border:2.5px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.summary-val{font-size:13px;font-weight:700;color:var(--s800)}

/* ── NOTIFICATIONS ── */
.notif-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:white;font-size:10px;font-weight:800;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 5px rgba(239,68,68,0.3)}
.notif-item{transition:transform .2s ease,box-shadow .2s ease}
.notif-item:hover{transform:translateY(-2px);box-shadow:0 6px 15px rgba(0,0,0,0.08)!important}
.notif-item:active{transform:scale(.98)}

.btn-edit{background:var(--g100);color:var(--g700);border:1px solid var(--g300);cursor:pointer;font-weight:700;transition:all .2s;font-family:'Outfit',sans-serif;}
.btn-edit:hover{background:var(--g200);border-color:var(--g400)}

/* ── SMS TOAST ── */
@keyframes smsDown{0%{transform:translate(-50%,-120%);opacity:0}100%{transform:translate(-50%,0);opacity:1}}
@keyframes smsUp{0%{transform:translate(-50%,0);opacity:1}100%{transform:translate(-50%,-120%);opacity:0}}
.sms-overlay{position:fixed;top:20px;left:50%;width:100%;max-width:380px;padding:0 16px;z-index:10000;pointer-events:none;transform:translateX(-50%)}
.sms-card{background:rgba(255,255,255,.94);backdrop-filter:blur(12px);border-radius:22px;padding:15px 18px;box-shadow:0 15px 45px rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.5);animation:smsDown .6s cubic-bezier(.16,1,.3,1) forwards;pointer-events:auto;width:100%;display:flex;gap:12px;align-items:flex-start}
.sms-card.hide{animation:smsUp .6s cubic-bezier(.16,1,.3,1) forwards}
.sms-icon-bx{width:38px;height:38px;border-radius:10px;background:#3b82f6;display:flex;align-items:center;justify-content:center;font-size:20px;color:white;flex-shrink:0;box-shadow:0 4px 12px rgba(59,130,246,.3)}
.sms-content{flex:1}
.sms-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px}
.sms-app{font-size:11px;font-weight:800;color:#3b82f6;text-transform:uppercase;letter-spacing:.6px}
.sms-time{font-size:10px;color:var(--s400);font-weight:600}
.sms-sender{font-size:14px;font-weight:800;color:var(--s900);margin-bottom:2px}
.sms-body{font-size:13px;color:var(--s700);line-height:1.45}
`;

function GlobalStyle() {
  useEffect(() => {
    const tag = document.createElement("style");
    tag.innerHTML = CSS + `
      .web-layout { display: flex; min-height: 100vh; background: #f0fdf4; width: 100%; }
      .sidebar { width: 250px; background: var(--g900); display: flex; flex-direction: column; position: fixed; height: 100vh; z-index: 100; }
      .sidebar-logo { padding: 30px 20px; display: flex; flex-direction: column; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); }
      .sidebar-logo-icon { width: 50px; height: 50px; background: rgba(255,255,255,0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 10px; color: white; }
      .sidebar-logo-name { color: white; font-weight: 800; font-size: 16px; }
      .sidebar-nav { flex: 1; padding: 20px 0; overflow-y: auto; }
      .sn-item { display: flex; align-items: center; gap: 12px; padding: 12px 20px; color: rgba(255,255,255,0.7); cursor: pointer; transition: 0.2s; border: none; background: none; width: 100%; text-align: left; font-family: inherit; }
      .sn-item:hover { background: rgba(255,255,255,0.05); color: white; }
      .sn-item.act { background: rgba(255,255,255,0.1); color: white; border-right: 4px solid var(--g400); }
      .sn-icon { font-size: 18px; }
      .sn-label { font-weight: 600; font-size: 14px; }
      .main-content { margin-left: 250px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; width: calc(100% - 250px); }
      @media (max-width: 900px) {
        .sidebar { display: none !important; }
        .main-content { margin-left: 0 !important; width: 100% !important; padding-bottom: 70px; }
      }
    `;
    document.head.appendChild(tag);
    return () => { if (document.head.contains(tag)) document.head.removeChild(tag); };
  }, []);
  return null;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("dashboard");
  const [history, setHist] = useState([]);
  const [result, setResult] = useState(null);
  const [lang, setLang] = useState("en");
  const [sms, setSms] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const addNotif = (title, message) => {
    const newNotif = { id: Date.now().toString(), title, message, date: new Date().toISOString(), read: false };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const nav = s => setScreen(s);
  const saveRes = r => setHist(prev => [r, ...prev]);
  const logout = () => { setUser(null); setScreen("dashboard"); setHist([]); setResult(null); };

  // Fetch farmer data on login
  useEffect(() => {
    if (user && (user.role === 'farmer' || !user.role)) {
      console.log("Fetching data for farmer:", user.id);
      
      // 1. Fetch History
      fetch(`${API_BASE}/api/predictions?farmer_id=${user.id}`)
        .then(res => {
          if(!res.ok) throw new Error(`API error: ${res.status}`);
          return res.json();
        })
        .then(data => {
          console.log("Predictions received:", data.count);
          if (data.predictions) {
            const mapped = data.predictions.map(p => ({
              ...p,
              id: p.prediction_id || p.id,
              crop: p.crop || p.crop_type || "Maize",
              timestamp: p.timestamp || p.created_at || new Date().toISOString(),
              sector: p.sector || p.sector_name || user.sector || "Bugesera"
            }));
            setHist(mapped);
          }
        })
        .catch(err => {
          console.error("History fetch error:", err);
          // Fallback to empty if failed
          setHist([]);
        });

      // 2. Fetch Advice/Notifications
      fetch(`${API_BASE}/api/notifications/${user.id}`)
        .then(res => {
          if(!res.ok) throw new Error(`Advice API error: ${res.status}`);
          return res.json();
        })
        .then(data => {
          console.log("Advice received for", user.id, ":", data.advice?.length || 0);
          if (data.advice) {
            const formatted = data.advice.map(a => ({
              id: a.id || a.advice_id,
              title: a.subject || (lang==="en"?"Agriculture Advice":"Inama ku Buhinzi"),
              message: a.message,
              date: a.created_at || new Date().toISOString(),
              read: false,
              sender: a.officer_type === 'district' 
                      ? `${a.officer_name} (District)` 
                      : `${a.officer_name} (${a.officer_sector || 'Sector'})`,
            }));
            setNotifications(formatted);
          }
        })
        .catch(err => console.error("Advice fetch error:", err));
    }
  }, [user]);


  if (!user) return (
    <>
      <GlobalStyle />
      <AuthScreen onLogin={u=>{setUser(u); setScreen("dashboard");}} lang={lang} setLang={setLang} setSms={setSms} addNotif={addNotif} />
      <SmsNotification sms={sms} onClear={()=>setSms(null)} />
    </>
  );

  if (user.role === "district" || user.role === "officer" || user.role === "sector") return (
    <>
      <GlobalStyle />
      <SmsNotification sms={sms} onClear={()=>setSms(null)} />
      <OfficerApp user={user} onLogout={logout} lang={lang} setLang={setLang} />
    </>
  );

  const renderScreen = () => {
    const sh = {lang, setLang, notifications, setNotifications};
    switch(screen) {
      case "dashboard": return <DashboardScreen user={user} onNavigate={nav} onResult={p=>{setResult(p); setScreen("result");}} history={history} {...sh} />;
      case "predict":   return <PredictScreen   user={user} onNavigate={nav} onResult={p=>{setResult(p); setScreen("result");}} onSave={saveRes} history={history} {...sh} />;
      case "result":    return <ResultScreen    result={result} onNavigate={nav} onSave={saveRes} history={history} {...sh} />;
      case "history":   return <HistoryScreen   predictions={history} onNavigate={nav} setSelectedPred={p=>{setResult(p); setScreen("result");}} user={user} {...sh} />;
      case "weather":   return <WeatherScreen   onNavigate={nav} user={user} {...sh} />;
      case "tips":      return <TipsScreen      onNavigate={nav} user={user} {...sh} />;
      case "profile":   return <ProfileScreen   user={user} onNavigate={nav} onLogout={logout} {...sh} />;
      case "notifications": return <NotificationsScreen onNavigate={nav} notifications={notifications} setNotifications={setNotifications} user={user} {...sh} />;
      
      // Missing settings routes
      case "edit-profile":    return <EditProfileScreen user={user} onNavigate={nav} setUser={setUser} {...sh} />;
      case "change-password": return <ChangePasswordScreen user={user} onNavigate={nav} {...sh} />;
      case "language":       return <LanguageScreen onNavigate={nav} {...sh} />;
      case "about":          return <AboutAppScreen onNavigate={nav} {...sh} />;
      
      default: return <DashboardScreen user={user} onNavigate={nav} onResult={p=>{setResult(p); setScreen("result");}} history={history} {...sh} />;
    }
  };

  return (
    <>
      <GlobalStyle />
      <SmsNotification sms={sms} onClear={()=>setSms(null)} />
      <div className="web-layout">
        <Sidebar current={screen} onNavigate={nav} user={user} onLogout={logout} lang={lang} setLang={setLang} />
        <div className="main-content">
          {renderScreen()}
          <BottomNav current={screen} onNavigate={nav} lang={lang} user={user} />
        </div>
      </div>
    </>
  );
}

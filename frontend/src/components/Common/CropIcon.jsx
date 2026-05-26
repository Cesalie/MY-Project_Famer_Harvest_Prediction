import React from "react";
import { GiCorn, GiPlantSeed, GiBowlOfRice } from "react-icons/gi";

export default function CropIcon({ name, style, size = 24, color = "var(--g600)" }) {
  const iconStyle = { ...style, fontSize: size, color: color };
  
  switch (name) {
    case "Maize":
      return <GiCorn style={iconStyle} />;
    case "Beans":
      return <GiPlantSeed style={iconStyle} />;
    case "Rice":
      return <GiBowlOfRice style={iconStyle} />;
    default:
      return <GiPlantSeed style={iconStyle} />;
  }
}

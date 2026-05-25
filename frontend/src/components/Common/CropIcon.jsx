import React from "react";
import { GiCorn, GiPlantSeed, GiBowlOfRice } from "react-icons/gi";

export default function CropIcon({ name, style, size = 24 }) {
  const iconStyle = { ...style, fontSize: size };
  
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

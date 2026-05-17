
def generate_recommendations(crop, yield_pred, fertilizer, irrigation, soil_health,
                            weather_impact, pest_pressure, rainfall, temperature,
                            extension_access, credit_access, farm_size):
    recommendations, warnings_list, score = [], [], 100
    rainfall, temperature, farm_size = float(rainfall), float(temperature), float(farm_size)
    crop_benchmarks = {"Maize": 2500, "Beans": 1200, "Rice": 3800}
    benchmark = crop_benchmarks.get(crop, 2000)
    pct = yield_pred / benchmark * 100 if benchmark > 0 else 0
    if yield_pred < benchmark * 0.6:
        warnings_list.append(f"CRITICAL: Yield ({yield_pred:.0f} Kg/Ha) {100-pct:.0f}% below benchmark.")
        score -= 30
    elif yield_pred < benchmark * 0.85:
        warnings_list.append(f"Below average: Yield {pct:.0f}% of district benchmark.")
        score -= 15
    else:
        recommendations.append(f"Good yield: {yield_pred:.0f} Kg/Ha = {pct:.0f}% of benchmark.")
    if str(fertilizer).strip().title() in ["No", "None"]:
        recommendations.append("Apply NPK 17-17-17 (50 Kg/Ha) to boost yields 30-50%.")
        score -= 15
    if rainfall < 700 and str(irrigation).strip().title() in ["No", "None"]:
        warnings_list.append("Low rainfall. Install supplemental irrigation.")
        score -= 10
    if soil_health == "Poor":
        warnings_list.append("Poor soil. Apply lime + compost 5 tons/Ha.")
        score -= 15
    if pest_pressure in ["High", "Severe"]:
        warnings_list.append("High pest pressure. Implement IPM immediately.")
        score -= 15
    score = max(0, min(100, score))
    return recommendations, warnings_list, score

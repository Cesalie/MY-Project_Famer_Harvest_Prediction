"""
Train on Bugesera_Harvest_Dataset_v2.csv
Target: Yield_Kg_per_Area_Planted
"""
import os, json, warnings
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.preprocessing   import StandardScaler, LabelEncoder
from sklearn.ensemble        import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model    import Ridge
from sklearn.metrics         import r2_score, mean_absolute_error, mean_squared_error
from sklearn.impute          import SimpleImputer

warnings.filterwarnings('ignore')
BASE    = os.path.dirname(os.path.abspath(__file__))
DATA    = os.path.join(BASE, 'Bugesera_Harvest_Dataset_v2.csv')

print("="*60)
print("  Training on Bugesera_Harvest_Dataset_v2.csv")
print("="*60)

df = pd.read_csv(DATA)
df = df.drop(columns=['bucket'], errors='ignore')
print(f"  Rows: {len(df)} | Cols: {len(df.columns)}")

TARGET = 'Yield_Kg_per_Area_Planted'

# ── Encode categoricals ───────────────────────────────────────────────────────
le_dict = {}
cat_cols = ['Season','Month','Sector','Crop_Type','Terrain_Type','Seed_Variety',
            'Fertilizer_Used','Fertilizer_Type','Irrigation_Used','Previous_Crop',
            'Pest_Disease_Pressure','Labor_Availability','Extension_Service_Access',
            'Credit_Access','Soil_Type']
for col in cat_cols:
    if col in df.columns:
        le = LabelEncoder()
        df[col+'_enc'] = le.fit_transform(df[col].fillna('Unknown').astype(str))
        le_dict[col] = le

# ── Engineered features ───────────────────────────────────────────────────────
df['Is_Season_A']    = (df['Season'] == 'Season A').astype(int)
df['Rain_Adequacy']  = df.apply(lambda r: min(
    r['Total_Rainfall_mm'] / {'Maize':500,'Beans':400,'Rice':650}.get(r['Crop_Type'],500), 2.0), axis=1)
df['pH_Optimality']  = df['Soil_pH'].apply(lambda x: max(0, 1-abs(x-6.5)/2.0))
df['Sunshine_Score'] = df['Sunshine_Hours_per_Day'].apply(lambda x: min(1.0, x/9.5))
df['Water_Balance']  = df['Total_Rainfall_mm'] - df['Evapotranspiration_mm']
df['Temp_Deviation'] = df.apply(lambda r: abs(r['Avg_Temperature_Celsius'] -
    {'Maize':23,'Beans':22,'Rice':25}.get(r['Crop_Type'],23)), axis=1)
df['Fert_Kg_Are'] = df['Fertilizer_Amount_Kg_Are']  # already in kg/are

# ── Features ──────────────────────────────────────────────────────────────────
FEATURES = [
    'Year','Is_Season_A',
    'Sector_enc','Crop_Type_enc',
    'Farm_Size_Ha','Area_Planted_Are',
    'Terrain_Type_enc','Seed_Variety_enc',
    'Fertilizer_Used_enc','Fertilizer_Type_enc','Fert_Kg_Are',
    'Irrigation_Used_enc',
    'Previous_Crop_enc','Pest_Disease_Pressure_enc',
    'Labor_Availability_enc','Extension_Service_Access_enc','Credit_Access_enc',
    'Market_Distance_km',
    'Soil_Type_enc','Soil_pH','Organic_Matter_Pct',
    'Nitrogen_ppm','Phosphorus_ppm','Potassium_ppm',
    'Avg_Temperature_Celsius','Total_Rainfall_mm','Relative_Humidity_Pct',
    'Sunshine_Hours_per_Day','Wind_Speed_kmh','Evapotranspiration_mm',
    'Rain_Adequacy','pH_Optimality','Sunshine_Score','Water_Balance','Temp_Deviation',
]
FEATURES = [f for f in FEATURES if f in df.columns]
print(f"  Features: {len(FEATURES)}")

X = df[FEATURES].copy()
y = df[TARGET].copy()
mask = y.notna() & (y > 0)
X, y = X[mask].reset_index(drop=True), y[mask].reset_index(drop=True)

imputer = SimpleImputer(strategy='median')
X_imp   = pd.DataFrame(imputer.fit_transform(X), columns=FEATURES)

X_train, X_test, y_train, y_test = train_test_split(
    X_imp, y.values, test_size=0.20, random_state=42)
print(f"  Train: {len(X_train)} | Test: {len(X_test)}")

scaler    = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

# ── Train ─────────────────────────────────────────────────────────────────────
models = {
    'Random Forest':    (RandomForestRegressor(n_estimators=500, max_depth=None,
                         min_samples_leaf=1, max_features='sqrt',
                         random_state=42, n_jobs=-1), False),
    'Gradient Boosting':(GradientBoostingRegressor(n_estimators=500, learning_rate=0.05,
                         max_depth=5, subsample=0.85, random_state=42), False),
    'Ridge Regression': (Ridge(alpha=1.0), True),
}

results = {}
kf = KFold(n_splits=5, shuffle=True, random_state=42)

for name, (mdl, scaled) in models.items():
    print(f"\n  Training {name}...")
    Xtr = X_train_s if scaled else X_train.values
    Xte = X_test_s  if scaled else X_test.values
    mdl.fit(Xtr, y_train)
    yp   = mdl.predict(Xte)
    r2   = r2_score(y_test, yp)
    mae  = mean_absolute_error(y_test, yp)
    rmse = np.sqrt(mean_squared_error(y_test, yp))
    cv   = cross_val_score(mdl, Xtr, y_train, cv=kf, scoring='r2', n_jobs=-1)
    results[name] = dict(model=mdl, r2=r2, mae=mae, rmse=rmse,
                         cv_mean=cv.mean(), accuracy=round(r2*100,2), scaled=scaled)
    print(f"    R²={r2:.4f} ({r2*100:.1f}%)  MAE={mae:.3f}  CV={cv.mean():.4f}")

best_name = max(results, key=lambda k: results[k]['r2'])
best      = results[best_name]
print(f"\n  Best: {best_name}  R²={best['r2']:.4f} ({best['r2']*100:.1f}%)")

# Feature importance
if hasattr(best['model'], 'feature_importances_'):
    fi = pd.Series(best['model'].feature_importances_, index=FEATURES).nlargest(10)
    print("\n  Top 10 features:")
    for f,v in fi.items(): print(f"    {f:40} {v:.4f}")

# Benchmarks
benchmarks = {}
for crop in ['Maize','Beans','Rice']:
    avg = df[df['Crop_Type']==crop][TARGET].mean()
    benchmarks[crop] = round(float(avg), 2)
    print(f"  {crop}: {avg:.2f} kg/are")

# Save
joblib.dump(best['model'],                         os.path.join(BASE,'best_model.pkl'))
joblib.dump(results['Random Forest']['model'],     os.path.join(BASE,'random_forest.pkl'))
joblib.dump(results['Gradient Boosting']['model'], os.path.join(BASE,'gradient_boosting.pkl'))
joblib.dump(results['Ridge Regression']['model'],  os.path.join(BASE,'linear_regression.pkl'))
joblib.dump(scaler,  os.path.join(BASE,'scaler.pkl'))
joblib.dump(le_dict, os.path.join(BASE,'label_encoders.pkl'))
joblib.dump(imputer, os.path.join(BASE,'imputer.pkl'))

metadata = {
    'best_model': best_name, 'r2_score': round(best['r2'],4),
    'accuracy_pct': round(best['r2']*100,2), 'mae': round(best['mae'],3),
    'features': FEATURES, 'feature_count': len(FEATURES),
    'target': TARGET, 'crops': ['Maize','Beans','Rice'],
    'sectors': list(df['Sector'].unique()),
    'dataset_rows': len(df), 'train_rows': len(X_train), 'test_rows': len(X_test),
    'crop_benchmarks_kg_are': benchmarks,
    'units': {'input':'are','output':'kg/are'},
    'model_comparison': {n:{'r2':round(r['r2'],4),'r2_test':round(r['r2'],4),
        'mae':round(r['mae'],3),'accuracy':r['accuracy']} for n,r in results.items()},
    '_perf': {n:{'r2':round(r['r2'],4),'accuracy':r['accuracy']} for n,r in results.items()},
    'yield_stats': {'min':round(float(y.min()),2),'max':round(float(y.max()),2),
                    'mean':round(float(y.mean()),2),'std':round(float(y.std()),2)},
}
with open(os.path.join(BASE,'model_metadata.json'),'w') as f:
    json.dump(metadata, f, indent=2)

print("\n"+"="*60)
print("  TRAINING COMPLETE")
print("="*60)
for n,r in results.items():
    mark = " ← BEST" if n==best_name else ""
    print(f"  {n:22}: R²={r['r2']:.4f}  Acc={r['accuracy']:.1f}%  MAE={r['mae']:.2f}{mark}")
achieved = '✓ ACHIEVED' if best['r2']>=0.90 else f'✗ {best["r2"]*100:.1f}%'
print(f"\n  Target ≥90%: {achieved}")
print("  Restart Flask API to load new models.\n")

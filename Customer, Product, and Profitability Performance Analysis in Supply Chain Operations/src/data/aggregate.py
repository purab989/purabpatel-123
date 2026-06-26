import pandas as pd, json, os

df = pd.read_csv('/mnt/user-uploads/APL_Logistics.csv', encoding='latin-1')

df = df[df['Sales'] > 0].copy()
num = ['Sales','Order Profit Per Order','Order Item Discount','Order Item Total',
       'Order Item Discount Rate','Order Item Quantity']
for c in num:
    df[c] = pd.to_numeric(df[c], errors='coerce')
df = df.dropna(subset=['Sales','Order Profit Per Order'])

def disc_bucket(r):
    if r <= 0: return '0%'
    if r <= 0.05: return '0-5%'
    if r <= 0.10: return '5-10%'
    if r <= 0.15: return '10-15%'
    if r <= 0.20: return '15-20%'
    return '20%+'
df['DiscBucket'] = df['Order Item Discount Rate'].apply(disc_bucket)

def rnd(x, d=2): return round(float(x), d)

out = {}
out['overview'] = {
    'totalRevenue': rnd(df['Sales'].sum()),
    'totalProfit': rnd(df['Order Profit Per Order'].sum()),
    'totalOrders': int(len(df)),
    'totalCustomers': int(df['Customer Id'].nunique()),
    'totalProducts': int(df['Product Name'].nunique()),
    'avgDiscount': rnd(df['Order Item Discount Rate'].mean()*100),
    'profitMargin': rnd(df['Order Profit Per Order'].sum()/df['Sales'].sum()*100),
    'totalDiscount': rnd(df['Order Item Discount'].sum()),
}

def group(keys):
    g = df.groupby(keys, observed=True).agg(
        sales=('Sales','sum'),
        profit=('Order Profit Per Order','sum'),
        discount=('Order Item Discount','sum'),
        orders=('Sales','size'),
        qty=('Order Item Quantity','sum'),
    ).reset_index()
    for c in ['sales','profit','discount','qty']:
        g[c] = g[c].round(2)
    return g

grain = group(['Market','Order Region','Customer Segment','Category Name','DiscBucket'])
grain.columns = ['market','region','segment','category','discBucket','sales','profit','discount','orders','qty']
out['grain'] = grain.to_dict(orient='records')

pgrain = group(['Product Name','Category Name','Customer Segment','Market'])
pgrain.columns = ['product','category','segment','market','sales','profit','discount','orders','qty']
out['productGrain'] = pgrain.to_dict(orient='records')

cust = df.groupby('Customer Id').agg(
    fname=('Customer Fname','first'), lname=('Customer Lname','first'),
    segment=('Customer Segment','first'), country=('Customer Country','first'),
    sales=('Sales','sum'), profit=('Order Profit Per Order','sum'), orders=('Sales','size')
).reset_index()
cust['name'] = cust['fname'].astype(str)+' '+cust['lname'].astype(str)
cust['margin'] = (cust['profit']/cust['sales']*100).round(2)
for c in ['sales','profit']: cust[c]=cust[c].round(2)
cols = ['Customer Id','name','segment','country','sales','profit','orders','margin']
out['topCustomers'] = cust.sort_values('profit', ascending=False).head(15)[cols].rename(columns={'Customer Id':'id'}).to_dict(orient='records')
out['bottomCustomers'] = cust.sort_values('profit', ascending=True).head(15)[cols].rename(columns={'Customer Id':'id'}).to_dict(orient='records')

def tier(p):
    if p >= 1000: return 'Platinum'
    if p >= 400: return 'Gold'
    if p >= 100: return 'Silver'
    if p >= 0: return 'Bronze'
    return 'Loss-making'
cust['tier'] = cust['profit'].apply(tier)
tiers = cust.groupby('tier').agg(customers=('Customer Id','size'),
        profit=('profit','sum'), sales=('sales','sum')).reset_index()
tiers['profit']=tiers['profit'].round(2); tiers['sales']=tiers['sales'].round(2)
out['tiers'] = tiers.to_dict(orient='records')

with open('/dev-server/src/data/analytics.json','w') as f:
    json.dump(out, f)
print('grain rows', len(out['grain']), 'product rows', len(out['productGrain']))
print('file MB', round(os.path.getsize('/dev-server/src/data/analytics.json')/1e6,2))

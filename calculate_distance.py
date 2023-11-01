import math
import copy 

# 緯度と経度から距離を計算する(単位:km)
def haversine_distance(lat1, lng1, lat2, lng2):
    earth_radius = 6371
    # 緯度と経度をラジアンに変換
    lat1 = math.radians(lat1)
    lng1 = math.radians(lng1)
    lat2 = math.radians(lat2)
    lng2 = math.radians(lng2)
    # ハーバーサインの公式
    dlng = lng2 - lng1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return earth_radius * c

# 引数(緯度と経度)とn番目に近いスポットの情報を返却(sn,lat,lng,dist)(n>=1)
def calc_near_spot(lat,lng,n,spots_info):
    if n <= 0 or n > len(spots_info):
        print("指定した順位のスポットは存在しません")
        return ["存在しません",0,0,0]
    spots_info_calc = copy.deepcopy(spots_info)
    for i in range(len(spots_info)):    
        spots_info_calc[i].append(haversine_distance(lat,lng,spots_info[i][1][0],spots_info[i][1][1]))
    sorted_spot = sorted(spots_info_calc, key=lambda x:x[-1])
    return sorted_spot[n-1]

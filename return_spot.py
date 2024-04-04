from calculate_distance import haversine_distance 
import csv
import numpy as np


#レビュー数を読み込みこむ
review_num_path  = "data/number_of_review/岡山_numOfRview.csv"
with open(review_num_path,"r",encoding="utf-8") as f_r:
    reader = csv.reader(f_r)
    spot_and_numOfrev = {row[0]: int(row[1]) for row in reader}
max_review_num = max(spot_and_numOfrev.values())


#スコアが高いtop nスポットのスポットを返却
#spots_info = [[spot_name_1, [lat_1,lng_1], [aspects_1],[asp_vectors_1],[cluster_vectors_1],[spots_aspectsVector_float_1],spot_numOfRev,spot_url], ... ]
#形式は[[spot_name,[lat,lng],aspects,score,url], ...]
def return_spot(selected_lat, selected_lng, recommend_range, selected_aspect_list, spots_info,pref,n):
    recommend_spots_info = []
    for spot_info in spots_info:
        sn = spot_info[0]
        lat = spot_info[1][0]
        lng = spot_info[1][1]
        aspect_list = spot_info[2]
        asp_vec_list = spot_info[3]
        cluster_vec_list = spot_info[4]
        spots_aspectsVector = spot_info[5]
        spot_numOfRev = spot_info[6]
        spot_url = spot_info[7]
        if haversine_distance(selected_lat,selected_lng,lat,lng) <= recommend_range:
            selected_aspects_parm = [1] * len(selected_aspect_list)
            selected_aspectsVector,check_needed_aspect = return_selected_aspectsVector(selected_aspect_list,selected_aspects_parm,pref)
            score = calc_spot_score(selected_aspectsVector, spots_aspectsVector, spot_numOfRev)
            if score != 0:
                similar_aspects = []
                for aspect in aspect_list:
                    if aspect in check_needed_aspect:
                        similar_aspects.append(aspect)
                recommend_spots_info.append([sn,[lat,lng],aspect_list,similar_aspects,score,spot_url])
        sorted_recommend_spots_info = sorted(recommend_spots_info, key = lambda x:x[4],reverse=True)
    if len(sorted_recommend_spots_info) <= n:
        #print("return_spot : " ,sorted_recommend_spots_info)
        return sorted_recommend_spots_info
    else:
        #print("return_spot : " ,sorted_recommend_spots_info[0:n])
        return sorted_recommend_spots_info[0:n]

def cos_sim(v1, v2):
  if v1 != [0.0]*len(v1) and v2 != [0.0]*len(v2) :
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
  else:
    return 0.0
def return_selected_aspectsVector(selected_aspect_list,selected_aspect_parm_list,pref):
    read_clustering_path = f"data/all_aspect_clustering/{pref}aspect_clustering_result.csv"
    #全ての観点のクラスタリング結果から、選択した観点のベクトルを生成
    #含まれる位置で指定されたパラメータ * 1を足す
    list_aspects = []
    with open(read_clustering_path, 'r', newline='', encoding='utf-8') as csvfile:
        csv_reader = csv.reader(csvfile)
        for row in csv_reader:
            # 各行の要素数を取得
            list_aspects.append(row[1:])
    selected_aspectsVector = [0.0]*len(list_aspects)
    check_needed_aspect = []
    for index in range(len(list_aspects)):
        for selected_aspect_index in range(len(selected_aspect_list)):
            if selected_aspect_list[selected_aspect_index] in list_aspects[index]:
                selected_aspectsVector[index] += 1*selected_aspect_parm_list[selected_aspect_index]
                check_needed_aspect += list_aspects[index]
    return selected_aspectsVector,check_needed_aspect
    #return値は選択ベクトルと、選択観点が含まれるクラスタに含まれるすべての観点のリスト
def calc_w(revnum):
    ranges = list(range(0, 201, 10))
    ranges.append( float('inf'))

    for i in range(len(ranges) - 1):
        if ranges[i] < revnum <= ranges[i + 1]:
            return (i + 1) / (len(ranges)-1)  # 1-indexed範囲 / 範囲の数
        

def calc_spot_score(selected_aspectsVector, spots_aspectsVector, spot_numOfRev):
    score = 0.0
    similarity = cos_sim(selected_aspectsVector,spots_aspectsVector)
    if spot_numOfRev != None:
        #popularity  = spot_numOfRev/max_review_num
        popularity = calc_w(spot_numOfRev)
        score = popularity * similarity
    return score

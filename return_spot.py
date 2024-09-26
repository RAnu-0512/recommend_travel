from calculate_distance import haversine_distance 
import csv
import numpy as np


#レビュー数を読み込みこむ
# review_num_path  = "data/number_of_review/岡山_numOfRview.csv"
# with open(review_num_path,"r",encoding="utf-8") as f_r:
#     reader = csv.reader(f_r)
#     spot_and_numOfrev = {row[0]: int(row[1]) for row in reader}
# max_review_num = max(spot_and_numOfrev.values())


#スコアが高いtop nスポットのスポットを返却
# spots_info = {spotname:{lat:lat,lng:lng,aspects:{apsect1:{vector:vector1,spot_url:url,whichFrom:whichFrom,senti_score:senti_score,count:count,count_percentage:count_percentage},aspect2:{vector:vector2,...},..},aspectsVector:vector,numOfRev:number,},...}
#返却形式は[(spot_name,{"lat":lat,"lng":lng,"aspects":{aspect1:{senti_score:senti_score,count:count},..},"similar_aspects":{},"score":score,"spot_url":url}),(spot_name,{}), ...]
def return_spot(selected_lat, selected_lng, recommend_range, selected_aspect_list, spots_info,selected_style,pref,n):
    read_style_vector_path = f"./data_beta/style_vector/{pref}recStyle1_vector0.99_NoIN.csv"
    read_clustering_path = f"./data_beta/all_aspect_clustering/{pref}clustering_aspectFromCluster0.99.csv"
    #スタイルベクトルを読み込む
    style_vectors_dcit = {}
    with open(read_style_vector_path, 'r', newline='', encoding='utf-8') as csvfile:
        csv_reader = csv.reader(csvfile)
        for row in csv_reader:
            style_name = row[0]
            style_vector = row[1]
            style_vector_float = [float(value) for value in style_vector.replace("[", "").replace("]", "").replace("\n", "").replace(",","").split()]
            style_vectors_dcit[style_name] = style_vector_float
    
    #クラスタリングした観点を読み込む
    clustering_aspect_dict = {}
    with open(read_clustering_path, 'r', newline='', encoding='utf-8') as csvfile:
        csv_reader = csv.reader(csvfile)
        for row in csv_reader:
            # 各行の要素数を取得
            clustering_aspect_dict[row[0]] = row[1:]     
            
    style_dict = {"アートを楽しむ":"art",
                  "体験を満喫する":"experience",
                  "家族で過ごす":"family",
                  "自然を楽しむ":"nature",
                  "食事を楽しむ":"eating",
                  "買い物を楽しむ":"shopping",
                  "写真映えを狙う":"picture",
                  "教養を高める":"learning",
                  "歴史を感じる":"history",
                  "エンタメを楽しむ":"entertainment"}
    if selected_style != "何も選択されていません":    
        selected_style_word = style_dict[selected_style]
        check_needed_aspect_forStyle =return_check_needed_aspects(style_vectors_dcit[selected_style_word],clustering_aspect_dict)
    
    #{aspects:{apsect1:{vector:vector1,spot_url:url,whichFrom:whichFrom,senti_score:senti_score,count:count,count_percentage:count_percentage}}
    recommend_spots_info = {}
    for sn,spot_info in spots_info.items():
        lat = spot_info["lat"]
        lng = spot_info["lng"]
        aspects_need_info = ["senti_score","count"]
        new_aspects_dict = {} #spots_info["apsects"]を必要な情報だけに更新
        for aspect,aspects_info_dict in spot_info["aspects"].items():
            new_aspects_dict[aspect] = {key: aspects_info_dict[key] for key in aspects_need_info if key in aspects_info_dict}
        spots_aspectsVector = spot_info["aspectsVector"]
        spot_numOfRev = spot_info["numOfRev"]
        spot_url = spot_info["spot_url"]
        if haversine_distance(selected_lat,selected_lng,lat,lng) <= recommend_range:
            selected_aspects_parm = [1] * len(selected_aspect_list)
            selected_aspectsVector,check_needed_aspect = return_selected_aspectsVector(selected_aspect_list,selected_aspects_parm,pref)
            if selected_style != "何も選択されていません":   
                check_needed_aspect += check_needed_aspect_forStyle
                selected_aspectsVector = [a + b for a, b in zip(selected_aspectsVector, style_vectors_dcit[selected_style_word])]
            score = calc_spot_score(selected_aspectsVector, spots_aspectsVector, spot_numOfRev)
            if score != 0:
                similar_aspects_dict = {}
                for aspect,aspects_info_dict in new_aspects_dict.items():
                    if aspect in check_needed_aspect:
                        similar_aspects_dict[aspect] = aspects_info_dict
                recommend_spots_info[sn] = {"lat":lat,"lng":lng,"aspects":new_aspects_dict,"similar_aspects":similar_aspects_dict,"score":score,"spot_url":spot_url}
        # sorted_recommend_spots_info = sorted(recommend_spots_info, key = lambda x:x[4],reverse=True)
        sorted_recommend_spots_info = sorted(recommend_spots_info.items(), key=lambda item: item[1]["score"], reverse=True)
    if len(sorted_recommend_spots_info) <= n:
        return sorted_recommend_spots_info
    else:
        return sorted_recommend_spots_info[0:n]


def cos_sim(v1, v2):
  if v1 != [0.0]*len(v1) and v2 != [0.0]*len(v2) :
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
  else:
    return 0.0

def dot_sim(v1,v2):
    if v1 != [0.0]*len(v1) and v2 != [0.0]*len(v2) :
        return np.dot(v1, v2)
    else:
        return 0.0

#チェックが必要な観点リストを返す(推薦スタイルに応じた)
def return_check_needed_aspects(style_vector,clustering_aspect_dict):
    #チェックが必要な観点を返す
    check_needed_aspect = []
    for vector_index in range(len(style_vector)):
        if style_vector[vector_index] != 0:
            check_needed_aspect += clustering_aspect_dict[f"cluster{vector_index:03}"]
    return check_needed_aspect
    #return値は選択ベクトルと、そのベクトルが1以上のインデックス
    
    
def return_selected_aspectsVector(selected_aspect_list,selected_aspect_parm_list,pref):
    read_clustering_path = f"./data_beta/all_aspect_clustering/{pref}clustering_aspectFromCluster0.99.csv"
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
    similarity = dot_sim(selected_aspectsVector,spots_aspectsVector)
    if spot_numOfRev != None:
        #popularity  = spot_numOfRev/max_review_num
        popularity = calc_w(spot_numOfRev)
        score = popularity * similarity
    return score

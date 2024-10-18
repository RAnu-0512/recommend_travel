from calculate_distance import haversine_distance 
import csv
import numpy as np
from sklearn.preprocessing import normalize



#レビュー数を読み込みこむ
# review_num_path  = "data/number_of_review/岡山_numOfRview.csv"
# with open(review_num_path,"r",encoding="utf-8") as f_r:
#     reader = csv.reader(f_r)
#     spot_and_numOfrev = {row[0]: int(row[1]) for row in reader}
# max_review_num = max(spot_and_numOfrev.values())


#スコアが高いtop nスポットのスポットを返却
# spots_info = {spotname:{lat:lat,lng:lng,aspects:{apsect1:{vector:vector1,spot_url:url,whichFrom:whichFrom,senti_score:senti_score,count:count,count_percentage:count_percentage},aspect2:{vector:vector2,...},..},aspectsVector:vector,numOfRev:number,},...}
#返却形式は[(spot_name,{"lat":lat,"lng":lng,"aspects":{aspect1:{senti_score:senti_score,count:count},..},"similar_aspects":{},"score":score,"spot_url":url}),(spot_name,{}), ...]
def return_spot(selected_lat, selected_lng, recommend_range, selected_aspect_list, allpref_spots_info,cluster_info,selected_styles,selected_spots,popularity_type,pref,n):
    spots_info = allpref_spots_info[pref]
    read_style_vector_path = f"./data_beta/style_vector/{pref}recStyle1_vector0.99.csv"
    #スタイルベクトルを読み込む(旅行スタイル選択)
    style_vectors_dcit = {}
    with open(read_style_vector_path, 'r', newline='', encoding='utf-8') as csvfile:
        csv_reader = csv.reader(csvfile)
        for row in csv_reader:
            style_name = row[0]
            style_vector = row[1]
            style_vector_float = [float(value) for value in style_vector.replace("[", "").replace("]", "").replace("\n", "").replace(",","").split()]
            style_vectors_dcit[style_name] = style_vector_float

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
    if selected_styles != ["何も選択されていません"]:
        check_needed_aspect_forStyle1 = []
        for selected_style in selected_styles:
            selected_style_word = style_dict[selected_style]
            check_needed_aspect_forStyle1 +=return_check_needed_aspects(style_vectors_dcit[selected_style_word],cluster_info)
    

    #推薦スタイル2のベクトルを読み込む(スポットが選択されたときのベクトル)
    cluster_ids = list(cluster_info.keys())
    num_clusters = len(cluster_ids)
    selected_spot_vector = np.zeros(num_clusters)
    if selected_spots != ["何も選択されていません"] :
        for selected_spot in selected_spots:
            splited_spot = selected_spot.split("[地域:")
            spot_name = splited_spot[0]
            spot_prefecture = splited_spot[1].replace("]","")
            selected_spot_vector_add = calc_selected_spot_vector(allpref_spots_info[spot_prefecture][spot_name]["aspects"],cluster_info)
            selected_spot_vector = [a + b for a, b in zip(selected_spot_vector, selected_spot_vector_add)]
        check_needed_aspect_forStyle2 = return_check_needed_aspects(selected_spot_vector,cluster_info)


    #優先度による観点選択ベクトルの重みづけ
    priority_score_map = {
        "1": 1.0,
        "2": 0.8,
        "3": 0.6,
        "4": 0.4,
        "5": 0.2
    }
    selected_aspects_parm = [priority_score_map[aspect["priority"]] for aspect in selected_aspect_list]
    selected_aspects = [aspect["aspect"] for aspect in selected_aspect_list]
    print("選択した観点 : ",selected_aspects)
    print("選択した観点の重み : ",selected_aspects_parm)
    
    #spot_info[aspects]の形式 : {aspects:{apsect1:{vector:vector1,spot_url:url,whichFrom:whichFrom,senti_score:senti_score,count:count,count_percentage:count_percentage}}
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
        major_aspect_list = spot_info["major_aspects"]
        miner_aspect_list = spot_info["miner_aspects"]
        
        
        if haversine_distance(selected_lat,selected_lng,lat,lng) <= recommend_range:
            selected_aspectsVector,check_needed_aspect = return_selected_aspectsVector(selected_aspects,selected_aspects_parm,pref)
            selected_style_vector = np.zeros(num_clusters)
            if selected_styles != ["何も選択されていません"] :   
                check_needed_aspect += check_needed_aspect_forStyle1
                for selected_style in selected_styles:
                    selected_style_word = style_dict[selected_style]
                    selected_style_vector = [a + b  for a, b in zip(selected_style_vector, style_vectors_dcit[selected_style_word])]
            if selected_spots != ["何も選択されていません"] :
                check_needed_aspect += check_needed_aspect_forStyle2
            sim1,sim2,sim3,popular_wight,score = calc_spot_score(selected_aspectsVector,selected_style_vector,selected_spot_vector,spots_aspectsVector, spot_numOfRev,popularity_type)
            if score != 0:
                similar_aspects_dict = {}
                major_aspects_dict = {}
                miner_aspects_dict = {}
                for aspect,aspects_info_dict in new_aspects_dict.items():
                    if aspect in check_needed_aspect:
                        similar_aspects_dict[aspect] = aspects_info_dict
                for aspect,aspects_info_dict in new_aspects_dict.items():
                    if aspect in major_aspect_list:
                        major_aspects_dict[aspect] = aspects_info_dict
                for aspect,aspects_info_dict in new_aspects_dict.items():
                    if aspect in miner_aspect_list:
                        miner_aspects_dict[aspect] = aspects_info_dict
                recommend_spots_info[sn] = {"lat":lat,"lng":lng,"aspects":new_aspects_dict,"similar_aspects":similar_aspects_dict,"major_aspects":major_aspects_dict,"miner_aspects":miner_aspects_dict,"score":score,"spot_url":spot_url,
                                            "selectAspectSim":sim1,"selectStyleSim":sim2,"selectSpotSim":sim3,"popularWight":popular_wight}
        # sorted_recommend_spots_info = sorted(recommend_spots_info, key = lambda x:x[4],reverse=True)
        sorted_recommend_spots_info = sorted(recommend_spots_info.items(), key=lambda item: item[1]["score"], reverse=True)
    if len(sorted_recommend_spots_info) <= n:
        return sorted_recommend_spots_info
    else:
        return sorted_recommend_spots_info[0:n]


def calc_selected_spot_vector(aspect_dict, cluster_dict):
    similarity_threshold=0.6
    # クラスタIDのリストとクラスタ数
    cluster_ids = list(cluster_dict.keys())
    num_clusters = len(cluster_ids)
    result_vector = np.zeros(num_clusters)
    # クラスタIDからインデックスへのマッピング
    cluster_id_to_index = {cluster_id: idx for idx, cluster_id in enumerate(cluster_ids)}    

    # アスペクトがどのクラスタに属しているかをマッピング
    aspect_to_cluster = {}
    for cluster_id, cluster_info in cluster_dict.items():
        for aspect in cluster_info["entities"]:
            aspect_to_cluster[aspect] = cluster_id
    
    # クラスタとアスペクトのエンベディングを取得
    cluster_embeddings = np.array([cluster_dict[cluster_id]["embedding"] for cluster_id in cluster_ids])
    aspect_ids = list(aspect_dict.keys())
    aspect_embeddings = np.array([aspect_dict[aspect]["vector"] for aspect in aspect_ids])
    
    # エンベディングを正規化（L2ノルム）
    cluster_embeddings_normalized = normalize(cluster_embeddings, axis=1)
    aspect_embeddings_normalized = normalize(aspect_embeddings, axis=1)
    
    # アスペクトが既にクラスタに属しているものとそうでないものに分ける
    assigned_aspects = {}
    unassigned_aspects = []
    
    for aspect in aspect_ids:
        if aspect in aspect_to_cluster:
            assigned_aspects[aspect] = aspect_to_cluster[aspect]
        else:
            unassigned_aspects.append(aspect)
    
    # 未割り当てアスペクトのインデックス取得
    unassigned_indices = [aspect_ids.index(aspect) for aspect in unassigned_aspects]
    
    if unassigned_aspects:
        # 未割り当てアスペクトのエンベディング
        unassigned_embeddings = aspect_embeddings_normalized[unassigned_indices]
        
        # コサイン類似度の計算（内積）
        similarity_matrix = np.dot(unassigned_embeddings, cluster_embeddings_normalized.T)  # shape: (num_unassigned, num_clusters)
        
        # 類似度が閾値未満のものを無効化
        similarity_matrix[similarity_matrix < similarity_threshold] = 0
        
        # 各アスペクトに対して最大類似度を持つクラスタを選択
        max_indices = similarity_matrix.argmax(axis=1)
        max_similarities = similarity_matrix.max(axis=1)
        
        # 割り当て処理
        for i, aspect in enumerate(unassigned_aspects):
            if max_similarities[i] > 0:
                cluster_id = cluster_ids[max_indices[i]]
                assigned_aspects[aspect] = cluster_id
            else:
                assigned_aspects[aspect] = None  # 類似するクラスタが見つからなかった場合
    
    # senti_scoreをresult_vectorに加算
    for aspect, cluster_id in assigned_aspects.items():
        if cluster_id is not None:
            index = cluster_id_to_index[cluster_id]
            senti_score = aspect_dict[aspect]["senti_score"]
            result_vector[index] += senti_score  # 同じクラスタに複数のアスペクトがある場合は加算
    
    # result_vectorをリストに変換して返す
    return result_vector.tolist()

# spots_info = {spotname:{lat:lat,lng:lng,aspects:{apsect1:vector1,aspect2:vector,..},aspectsVector:vector,numOfRev:number,spot_url:url,whichFrom:whichFrom,senti_score:senti_score,count:count,count_percentage:count_percentage}}]
def get_other_pref_spot(pref,allpref_spots_info):
    # 辞書をループしてスポット名と県名を収集
    list_spotname = [[pref]]
    for other_pref, spots in allpref_spots_info.items():
        # if other_pref != pref:
            for spot in spots.keys():
                list_spotname.append([spot, other_pref])
    return list_spotname

def cos_sim(v1, v2):
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    if norm_v1 != 0 and norm_v2 != 0:
        return np.dot(v1, v2) / (norm_v1 * norm_v2)
    else:
        return 0.0

def dot_sim(v1,v2):
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    if norm_v1 != 0 and norm_v2 != 0 :
        return np.dot(v1, v2)
    else:
        return 0.0

#チェックが必要な観点リストを返す(推薦スタイルに応じた)
def return_check_needed_aspects(style_vector,clustering_aspect_dict):
    #チェックが必要な観点を返す
    check_needed_aspect = []
    for vector_index in range(len(style_vector)):
        if style_vector[vector_index] != 0:
            check_needed_aspect += clustering_aspect_dict[f"cluster{vector_index:04}"]["entities"]
    return check_needed_aspect
    

#観点選択ベクトル生成と関連性がある観点の返却
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

#スポット推薦の有名/普通/穴場優先による重みづけ
def calc_weight(revnum,popularity_type):
    # 範囲の定義: 0, 10, 20, ..., 200, inf
    ranges = list(range(0, 201, 10))  # [0, 10, 20, ..., 200]
    ranges.append(float('inf'))       # [0, 10, 20, ..., 200, inf]
    num_ranges = len(ranges) - 1      # 21
    for i in range(num_ranges):
        if ranges[i] < revnum <= ranges[i + 1]:
            if popularity_type == "有名":
                # 有名の場合: 1/21 から 21/21
                normalized_value = (i + 1) / num_ranges
                return normalized_value
            elif popularity_type == "穴場":
                # 穴場の場合: 21/21 から 1/21
                normalized_value = (num_ranges - i) / num_ranges
                return normalized_value
            else:
                raise ValueError("popularity_type は '有名' または '穴場' のいずれかでなければなりません。")
    
    # revnum が範囲に含まれない場合（通常はあり得ないが念のため）
    raise ValueError("revnum が範囲外です。")
        
#スポットのスコア計算
def calc_spot_score(selected_aspectsVector,selected_style_vector,selected_spot_vector,spots_aspectsVector, spot_numOfRev,popularity_type):
    score = 0.0
    #dot_sim : 内積/cos_sim : コサイン類似度
    similarity_selectedAspectsVector = dot_sim(selected_aspectsVector,spots_aspectsVector)
    similarity_selectedStyleVector = dot_sim(selected_style_vector,spots_aspectsVector)
    similarity_selectedSpotVector = dot_sim(selected_spot_vector,spots_aspectsVector)

    similarity = similarity_selectedAspectsVector +  similarity_selectedStyleVector + similarity_selectedSpotVector

    if popularity_type == "普通":
        weight = 1
    elif popularity_type == "有名" or popularity_type == "穴場":
        if spot_numOfRev != None:
            weight = calc_weight(spot_numOfRev,popularity_type)
    score = weight * similarity
    return similarity_selectedAspectsVector,similarity_selectedStyleVector,similarity_selectedSpotVector,weight,score

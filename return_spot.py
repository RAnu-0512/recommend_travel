from calculate_distance import haversine_distance 
import csv
import numpy as np
from sklearn.preprocessing import normalize
import html
import sys
import MeCab
import re
import ipadic

mecab = MeCab.Tagger(ipadic.MECAB_ARGS)
def candidates_maker_mecab(str,num) :
  candidates_list= []
  mecab_candidates = mecab.parseNBest(num, str).split("EOS")
  mecab_candidates[0] = "\n"+mecab_candidates[0]
  for mecab_candidate in mecab_candidates:
    mecab_splited = mecab_candidate.strip().split("\n")
    candidates_list.append(mecab_splited)
  copy_cand = [[] for i in range(len(candidates_list))]
  for c in range(len(candidates_list)):
    for c2 in candidates_list[c]:
      copy_cand[c].append([a for a in re.split('[\t,]+',c2) if a != ''])
  return copy_cand[:-1]


#スコアが高いtop nスポットのスポットを返却
# spots_info = {spotname:{lat:lat,lng:lng,aspects:{apsect1:{vector:vector1,spot_url:url,whichFrom:whichFrom,senti_score:senti_score,count:count,count_percentage:count_percentage},aspect2:{vector:vector2,...},..},aspectsVector:vector,numOfRev:number,},...}
#返却形式は[(spot_name,{"lat":lat,"lng":lng,"aspects":{aspect1:{senti_score:senti_score,count:count},..},"similar_aspects":{},"score":score,"spot_url":url}),(spot_name,{}), ...]
def return_spot(selected_lat, selected_lng, recommend_range, selected_aspect_list, allpref_spots_info,cluster_info,pref_info,selected_styles,selected_spots,popularityLevel,pref,n):
    spots_info = allpref_spots_info[pref]
    read_style_vector_path = f"./data_beta/style_vector/{pref}recStyle1_vector0.99_NoIN.csv"
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
    check_needed_aspect_dict =  {} #{aspect:[factor1,factor2,...]}
    
    cluster_ids = list(cluster_info.keys())
    num_clusters = len(cluster_ids)
    selected_style_vector = np.zeros(num_clusters)
    selected_spot_vector = np.zeros(num_clusters)

    #推薦スタイル1のベクトルを読み込む(スタイルが選択された時のベクトル)
    if selected_styles != ["何も選択されていません"]:
        for selected_style in selected_styles:
            selected_style_word = style_dict[selected_style]

            check_needed_aspect_list = return_check_needed_aspects(style_vectors_dcit[selected_style_word],cluster_info) 
            for aspect in check_needed_aspect_list:
                if aspect not in check_needed_aspect_dict:
                    check_needed_aspect_dict[aspect] = [selected_style]
                else:
                    check_needed_aspect_dict[aspect].append(selected_style)
            selected_style_vector = [a + b  for a, b in zip(selected_style_vector, style_vectors_dcit[selected_style_word])]
    
    #推薦スタイル2のベクトルを読み込む(スポットが選択されたときのベクトル)
    if selected_spots != ["何も選択されていません"] :
        for selected_spot in selected_spots:
            splited_spot = selected_spot.split("[地域:")
            spot_name = html.unescape(splited_spot[0])
            spot_prefecture = splited_spot[1].replace("]","")
            selected_spot_vector_cur = calc_selected_spot_vector(allpref_spots_info[spot_prefecture][spot_name]["aspects"],cluster_info)

            check_needed_aspect_list = return_check_needed_aspects(selected_spot_vector_cur,cluster_info) 
            for aspect in check_needed_aspect_list:
                if aspect not in check_needed_aspect_dict:
                    check_needed_aspect_dict[aspect] = [spot_name]
                else:
                    check_needed_aspect_dict[aspect].append(spot_name)
            selected_spot_vector = [a + b for a, b in zip(selected_spot_vector, selected_spot_vector_cur)]


    #優先度による観点選択ベクトルの重みづけ
    priority_score_map = {
        "A": 1.0,
        "B": 0.8,
        "C": 0.6,
        "D": 0.4,
        "E": 0.2
    }
    selected_aspects_parm = [priority_score_map[aspect["priority"]] for aspect in selected_aspect_list]
    selected_aspects = [aspect["aspect"] for aspect in selected_aspect_list]
    print("選択した観点 : ",selected_aspects)
    print("選択した観点の重み : ",selected_aspects_parm)
    
    #spot_info[aspects]の形式 : {aspects:{apsect1:{vector:vector1,spot_url:url,whichFrom:whichFrom,senti_score:senti_score,count:count,count_percentage:count_percentage}}
    recommend_spots_info = {}
    max_selectAspectSim = 0
    max_selectStyleSim = 0
    max_selectSpotSim = 0
    for sn,spot_info in spots_info.items():
        #スポット毎の情報
        lat = spot_info["lat"]
        lng = spot_info["lng"]
        aspects_need_info = ["senti_score","count"]
        new_aspects_dict = {} #spots_info["apsects"]を必要な情報だけに更新
        for aspect,aspects_info_dict in spot_info["aspects"].items():
            new_aspects_dict[aspect] = {key: aspects_info_dict[key] for key in aspects_need_info if key in aspects_info_dict}
        spot_aspectsVector = spot_info["aspectsVector"]
        spot_numOfRev = spot_info["numOfRev"]
        spot_url = spot_info["spot_url"]
        homepage_name = spot_info["homepage_name"]
        img_url = spot_info["img_url"]
        major_aspect_list = spot_info["major_aspects"]
        miner_aspect_list = spot_info["miner_aspects"]
        aspects_label = spot_info["aspects_label"]
        
        #recommendationFactors
        if haversine_distance(selected_lat,selected_lng,lat,lng) <= recommend_range:
            selected_aspectsVector,check_needed_aspect_dict = return_selected_aspectsVector(selected_aspects,selected_aspects_parm,pref,check_needed_aspect_dict)
            sim1,sim2,sim3,popular_wight,sum_score = calc_spot_score(selected_aspectsVector,selected_style_vector,selected_spot_vector,spot_aspectsVector, spot_numOfRev,pref_info,popularityLevel)
            
            max_selectAspectSim = sim1 if max_selectAspectSim < sim1 else max_selectAspectSim
            max_selectStyleSim = sim2 if max_selectStyleSim < sim2 else max_selectStyleSim
            max_selectSpotSim = sim3 if max_selectSpotSim < sim3 else max_selectSpotSim
            
            
            if sum_score != 0:
                similar_aspects_dict = {}
                major_aspects_dict = {}
                miner_aspects_dict = {}
                for aspect,aspects_info_dict in new_aspects_dict.items():
                    aspects_mecab = []
                    for i in candidates_maker_mecab(aspect,1)[0]:
                        aspects_mecab.append(i[0])
                    if aspect in check_needed_aspect_dict:
                        similar_aspects_dict[aspect] = aspects_info_dict
                        similar_aspects_dict[aspect]["recommendFactors"] = check_needed_aspect_dict[aspect]

                    #形態素解析した時の結果も格納
                    for aspect_in_mecab in aspects_mecab:
                        if aspect_in_mecab in check_needed_aspect_dict:
                            if aspect not in similar_aspects_dict:
                                similar_aspects_dict[aspect] = aspects_info_dict
                            if "recommendFactors" not in similar_aspects_dict[aspect]:
                                similar_aspects_dict[aspect]["recommendFactors"] = check_needed_aspect_dict[aspect_in_mecab]
                            elif check_needed_aspect_dict[aspect_in_mecab] not in similar_aspects_dict[aspect]["recommendFactors"]:
                                similar_aspects_dict[aspect]["recommendFactors"] = list(set(similar_aspects_dict[aspect]["recommendFactors"] + check_needed_aspect_dict[aspect_in_mecab]))
                                
                    if aspect in major_aspect_list:
                        major_aspects_dict[aspect] = aspects_info_dict
                    if aspect in miner_aspect_list:
                        miner_aspects_dict[aspect] = aspects_info_dict
                
                similar_aspects_label = update_aspects_display(aspects_label, similar_aspects_dict)
                major_aspects_label = update_aspects_display(aspects_label, major_aspects_dict)
                miner_aspects_label = update_aspects_display(aspects_label, miner_aspects_dict)
                recommend_spots_info[sn] = {"lat":lat,"lng":lng,"aspects":new_aspects_dict,"aspects_label":aspects_label,
                                            "similar_aspects":similar_aspects_dict,"similar_aspects_label":similar_aspects_label,
                                            "major_aspects":major_aspects_dict,"major_aspects_label":major_aspects_label,
                                            "miner_aspects":miner_aspects_dict,"miner_aspects_label":miner_aspects_label,
                                            "sum_score":sum_score,"spot_url":spot_url,"homepage_name":homepage_name,"img_url":img_url,
                                            "selectAspectSim":sim1,"selectStyleSim":sim2,"selectSpotSim":sim3,"popularWight":popular_wight}
        # sorted_recommend_spots_info = sorted(recommend_spots_info, key = lambda x:x[4],reverse=True)
    sorted_recommend_spots_info = dict(sorted(recommend_spots_info.items(), key=lambda item: item[1]["sum_score"], reverse=True))

    #スポットのスコアの和を最大値で割って正規化(内積のため)
    for sn,recommend_spot_info in sorted_recommend_spots_info.items():
        selectAspectSim = recommend_spot_info["selectAspectSim"]
        selectStyleSim = recommend_spot_info["selectStyleSim"]
        selectSpotSim = recommend_spot_info["selectSpotSim"]
        popular_wight = recommend_spot_info["popularWight"]
        
        normalized_selectAspectSim = selectAspectSim/max_selectAspectSim if max_selectAspectSim != 0 else  selectAspectSim
        normalized_selectStyleSim =  selectStyleSim/max_selectStyleSim if max_selectStyleSim != 0 else selectStyleSim
        normalized_selectSpotSim = selectSpotSim/max_selectSpotSim if max_selectSpotSim != 0  else  selectSpotSim
            
        sorted_recommend_spots_info[sn]["score"] = (normalized_selectAspectSim+normalized_selectStyleSim+normalized_selectSpotSim) * popular_wight

    sorted_recommend_spots_info_new = sorted(sorted_recommend_spots_info.items(), key=lambda item: item[1]["score"], reverse=True)
    
    print("辞書は以下(チェックが必要な観点:[factors,..]): ", check_needed_aspect_dict)

    if len(sorted_recommend_spots_info_new) <= n:
        return sorted_recommend_spots_info_new
    else:
        return sorted_recommend_spots_info_new[0:n]

def update_aspects_display(aspects_label, similar_aspects_dict):
    """
    aspects_labelの各aspectに対して、similar_aspects_dictに存在する場合は"display"を'on'に、
    存在しない場合は'off'に設定した新しい辞書を返す。
    ただし、すべてのaspectの"display"が'off'の場合、そのaspects_labelのキーは追加しない。

    :param aspects_label: 辞書形式のaspects_label
    :param similar_aspects_dict: 辞書形式のsimilar_aspects_dict
    :return: 更新された辞書
    """
    updated_aspects_label = {}

    for aspect_key, aspect_info in aspects_label.items():
        # 新しいエントリのコピー
        updated_entry = {
            'count': aspect_info.get('count', 0.0),
            'senti_score': aspect_info.get('senti_score', 0.0),
            'aspects': []
        }

        # 各aspectをチェック
        for aspect in aspect_info.get('aspects', []):
            aspect_name = aspect.get('aspect', '')
            if not aspect_name:
                continue  # aspect名が存在しない場合はスキップ

            # similar_aspects_dictに存在するか確認
            display_status = 'on' if aspect_name in similar_aspects_dict else 'off'

            # 更新されたaspectを追加
            updated_entry['aspects'].append({
                'aspect': aspect_name,
                'display': display_status
            })

        # 更新後、少なくとも1つのaspectが"display": 'on'であるか確認
        if any(a['display'] == 'on' for a in updated_entry['aspects']):
            updated_aspects_label[aspect_key] = updated_entry

    return updated_aspects_label

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
        for aspect in cluster_info["aspects"]:
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

# spots_info = {spotname:{lat:lat,lng:lng,aspects:{apsect1:{vector:vector1,spot_url:url,whichFrom:whichFrom,senti_score:senti_score,count:count,count_percentage:count_percentage},aspect2:{vector:vector2,...},..},aspectsVector:vector,numOfRev:number,},...}
def get_other_pref_spot(allpref_spots_info):
    # 辞書をループしてスポット名と県名を収集
    list_spotname = []
    for cur_pref, spots in allpref_spots_info.items():
        for spotname,spotinfo in spots.items():
            aspects = spotinfo.get('aspects', {})
            url = spotinfo.get('spot_url')
            aspects_label = spotinfo.get("aspects_label",{})
            homepage_name = spotinfo["homepage_name"]
            img_url = spotinfo["img_url"]
            new_aspects = {}
            for aspect_name,aspect_info in aspects.items():
                new_aspects[aspect_name] = {
                    'senti_score': aspect_info.get('senti_score'),
                    'count': aspect_info.get('count')
                }
            list_spotname.append({"spot_name":spotname,"prefecture":cur_pref,"aspects":new_aspects,"aspects_label":aspects_label,"spot_url":url,"homepage_name":homepage_name,"img_url":img_url})

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

#チェックが必要な観点リストを返す(推薦スタイル1,2に応じた)
def return_check_needed_aspects(style_vector,clustering_aspect_dict):
    #チェックが必要な観点を返す
    check_needed_aspect = []
    for vector_index in range(len(style_vector)):
        if style_vector[vector_index] != 0:
            check_needed_aspect += clustering_aspect_dict[f"cluster{vector_index:04}"]["aspects"]
    return check_needed_aspect


#観点選択ベクトル生成と関連性がある観点の返却
def return_selected_aspectsVector(selected_aspect_list,selected_aspect_parm_list,pref,check_needed_aspect_dict):
    read_clustering_path = f"./data_beta/all_aspect_clustering/{pref}clustering_aspectFromCluster0.99.csv"
    #全ての観点のクラスタリング結果から、選択した観点のベクトルを生成
    list_aspects = []
    with open(read_clustering_path, 'r', newline='', encoding='utf-8') as csvfile:
        csv_reader = csv.reader(csvfile)
        for row in csv_reader:
            # 各行の要素数を取得
            list_aspects.append(row[1:])
    selected_aspectsVector = [0.0]*len(list_aspects)
    for index in range(len(list_aspects)):
        aspectsInCluster = list_aspects[index]
        for selected_aspect_index in range(len(selected_aspect_list)):
            selected_aspect = selected_aspect_list[selected_aspect_index]
            if selected_aspect in aspectsInCluster:
                selected_aspectsVector[index] += selected_aspect_parm_list[selected_aspect_index]
                for check_aspect in aspectsInCluster:
                    if check_aspect not in check_needed_aspect_dict:
                        check_needed_aspect_dict[check_aspect] = [selected_aspect]
                    elif selected_aspect not in check_needed_aspect_dict[check_aspect] :
                        check_needed_aspect_dict[check_aspect].append(selected_aspect)
    return selected_aspectsVector,check_needed_aspect_dict
    #return値は選択ベクトルと、選択観点が含まれるクラスタに含まれるすべての観点のリスト,チェックリストdict

#スポット推薦の有名/普通/穴場優先による重みづけ
def calc_weight(revnum,popularityLevel,pref_info):
    #0:レビュー数下位30%
    #1:レビュー数下位40%
    #2:レビュー数下位50%
    # ....
    #6:レビュー数下位90%
    #7:全て
    #8:レビュー数上位90%
    #9:レビュー数上位80%
    # ....
    #13:レビュー数上位40%
    #14:レビュー数上位30%
    
    #revNum_threshold : 上位~%の最小レビュー数(100%であればすべてのレビュー数の最小値)

    #穴場---全て の間 + 全て の時
    if popularityLevel >= 0 and popularityLevel < 7:
        percentage = 70 - popularityLevel * 10
        revNum_threshold = pref_info[f"top{percentage}"] 
        if revnum < revNum_threshold:
            return 1.0
        else :
            return 0.0
    elif popularityLevel == 7:
        return 1.0
    #全て---有名所 の間
    elif popularityLevel > 7 and popularityLevel <= 14:
        percentage = 170 - popularityLevel * 10
        revNum_threshold = pref_info[f"top{percentage}"]
        if revnum >= revNum_threshold:
            return 1.0
        else:
            return 0.0
        
#スポットのスコア計算
def calc_spot_score(selected_aspectsVector,selected_style_vector,selected_spot_vector,spot_aspectsVector, spot_numOfRev,pref_info,popularityLevel):
    sum_score = 0.0
    #dot_sim : 内積/cos_sim : コサイン類似度
    similarity_selectedAspectsVector = dot_sim(selected_aspectsVector,spot_aspectsVector)
    similarity_selectedStyleVector = dot_sim(selected_style_vector,spot_aspectsVector)
    similarity_selectedSpotVector = dot_sim(selected_spot_vector,spot_aspectsVector)

    similarity = similarity_selectedAspectsVector +  similarity_selectedStyleVector + similarity_selectedSpotVector

    if spot_numOfRev != None:
        weight = calc_weight(spot_numOfRev,popularityLevel,pref_info)
    sum_score = weight * similarity
    return similarity_selectedAspectsVector,similarity_selectedStyleVector,similarity_selectedSpotVector,weight,sum_score

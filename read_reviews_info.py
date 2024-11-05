import csv
import os

def get_reviews_info():
    pref_list = [
        "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
        "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
        "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜",
        "静岡", "愛知", "三重", "滋賀", "京都", "大阪", "兵庫",
        "奈良", "和歌山", "鳥取", "島根", "岡山", "広島", "山口",
        "徳島", "香川", "愛媛", "高知", "福岡", "佐賀", "長崎",
        "熊本", "大分", "宮崎", "鹿児島", "沖縄"#,"全国"
    ]
    # pref_list = ["岡山"] #本番環境の時コメントアウト
    pref_dict = {}
    for pref in pref_list:
        pref_reviews_info = get_pref_reviews_info(pref)
        if pref_reviews_info != []:
            pref_dict[pref] = pref_reviews_info
            # if pref_dict["全国"] != []:
            #     pref_dict["全国"] += pref_info
    return pref_dict

def get_pref_reviews_info(pref):
    read_aspectAndCluster_folder_path = f"../rev_stat/aspects_from_chatGPT_cluster_with_count_preprocessed/{pref}/"
    read_reviews_folder_path = f"../rev_stat/pre_processed_review_txt/{pref}/"
    
    entries = os.listdir(read_aspectAndCluster_folder_path)
    files = [os.path.join(read_aspectAndCluster_folder_path, entry) for entry in entries if os.path.isfile(os.path.join(read_aspectAndCluster_folder_path, entry))]

    entities_dict = {}
    for read_aspectAndCluster_path in files:
        spot_name = os.path.basename(read_aspectAndCluster_path).replace("_aspects_from_gpt_cluster_with_count_preprocessed.csv","")
        entities_dict[spot_name]={}
        with open(read_aspectAndCluster_path,"r",encoding="utf-8") as f_r:
            reader = csv.reader(f_r)
            for row in reader:
                aspect = row[0]
                entities = row[5:]
                if len(entities) != 0:
                    entities_dict[spot_name][aspect]=entities
                else:
                    entities_dict[spot_name][aspect]=[aspect]
    reviews_dict = {}

    for read_aspectAndCluster_path in files:
        spot_name = os.path.basename(read_aspectAndCluster_path).replace("_aspects_from_gpt_cluster_with_count_preprocessed.csv","")
        read_reviews_path = f"{read_reviews_folder_path}{spot_name}review_preprocessed.txt"
        all_reviews = []
        reviews_dict[spot_name]={}
        with open(read_reviews_path, 'r', encoding='utf-8') as f_r:
            for line in f_r:
                review = line.strip()
                if review:  # 空行をスキップ
                    all_reviews.append(review)
        for aspect,entities in entities_dict[spot_name].items():
            reviews_dict[spot_name][aspect]=[]
            for entity in entities:
                for review in all_reviews:
                    if entity.replace(" ","") in review:
                        reviews_dict[spot_name][aspect].append({"entity":entity.replace(" ",""),"review":review})
            reviews_dict[spot_name][aspect] = remove_duplicate_reviews(reviews_dict[spot_name][aspect])
    return reviews_dict


def remove_duplicate_reviews(entAndRevPair):
    review_to_pair = {}
    
    for pair in entAndRevPair:
        review = pair['review']
        entity = pair['entity']
        
        # レビューがすでに辞書に存在する場合
        if review in review_to_pair:
            existing_entity = review_to_pair[review]['entity']
            # エンティティの長さを比較し、長い方を保持
            if len(entity) > len(existing_entity):
                review_to_pair[review] = pair
        else:
            review_to_pair[review] = pair
    
    # 重複を除いたペアのリストを作成
    filtered_pairs = list(review_to_pair.values())
    return filtered_pairs
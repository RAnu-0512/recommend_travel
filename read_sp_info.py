#スポットの情報を読み込む
import csv


def get_spotinfo():
    pref_list = [
        "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
        "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
        "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜",
        "静岡", "愛知", "三重", "滋賀", "京都", "大阪", "兵庫",
        "奈良", "和歌山", "鳥取", "島根", "岡山", "広島", "山口",
        "徳島", "香川", "愛媛", "高知", "福岡", "佐賀", "長崎",
        "熊本", "大分", "宮崎", "鹿児島", "沖縄"
    ]
    pref_list = ["岡山","東京"]
    pref_dict = {}
    for pref in pref_list:
        pref_info = get_pref_spot_info(pref)
        if pref_info != []:
            pref_dict[pref] = pref_info
    return pref_dict

#県のスポットの情報を読み込む
def get_pref_spot_info(pref):
    # spots_info = [[spot_name_1, [lat_1,lng_1], [aspects_1],[asp_vectors_1],[cluster_vectors_1],[spots_aspectsVector_float_1],spot_numOfRev,spot_url], ... ]
    try:
        spots_info = []
        latlng_info_path = f"data/latlng/{pref}_latlng_review_exist3.csv"
        with open(latlng_info_path, 'r', encoding='utf-8') as f_latlng:
            reader = csv.reader(f_latlng)
            for row in reader:
                sn = row[0]
                latlng=[]
                if(len(row) == 3):  # 最低3つの要素があることを確認
                    latlng.append(float(row[1]))
                    latlng.append(float(row[2]))
                spots_info.append([sn,latlng])

        aspect_folder_path = f"data/aspects_and_vectors_rm_dup/{pref}/"
        read_aspectsVector_path = f"data/spots_aspect_vector/{pref}aspectVector.csv"

        spots_aspectsVector = []
        spots_aspectsVector_float = []
        with open(read_aspectsVector_path, 'r', newline='', encoding='utf-8') as csvfile:
            csv_reader = csv.reader(csvfile)
            for row in csv_reader:
                spots_aspectsVector.append(row[1])
            for spot_index in range(len(spots_aspectsVector)):
                spots_aspectsVector_float.append([float(value) for value in spots_aspectsVector[spot_index].replace("[", "").replace("]", "").replace("\n", "").replace(",","").split()])

        #レビュー数を読み込みこむ
        review_num_path  = f"data/number_of_review/{pref}_numOfRview.csv"
        with open(review_num_path,"r",encoding="utf-8") as f_r:
            reader = csv.reader(f_r)
            spot_and_numOfrev = {row[0]: int(row[1]) for row in reader}

        #スポットのurlを読み込む
        url_info_path = f"data/url/{pref}_Spots_url_exist_3.csv"
        with open(url_info_path,"r",encoding="utf-8") as f_r:
            reader = csv.reader(f_r)
            url_info = {row[0]: row[1] for row in reader}

        for spot_index in range(len(spots_info)):
            aspect_path = aspect_folder_path + spots_info[spot_index][0] + "_aspects_vecs_deleted.csv"
            with open(aspect_path,"r",encoding="utf-8") as f_aspect:
                reader = csv.reader(f_aspect)
                header = next(reader)
                rows = list(reader)
            spot_n_aspect = []
            asp_vec_str = []
            asp_vec_float = []
            cluster_vec_str = []
            cluster_vec_float = []

            for row in rows:
                spot_n_aspect.append(row[0])
                asp_vec_str.append(row[1])
                cluster_vec_str.append(row[2])
            for aspect_index in range(len(spot_n_aspect)) :
                asp_vec_float.append([float(value) for value in asp_vec_str[aspect_index].replace("[", "").replace("]", "").replace("\n", "").split()])
                cluster_vec_float.append([float(value) for value in cluster_vec_str[aspect_index].replace("[", "").replace("]", "").replace("\n", "").split()])
            spots_info[spot_index].append(spot_n_aspect)
            spots_info[spot_index].append(asp_vec_float)
            spots_info[spot_index].append(cluster_vec_float)
            spots_info[spot_index].append(spots_aspectsVector_float[spot_index])
            spots_info[spot_index].append(spot_and_numOfrev.get(spots_info[spot_index][0],None))
            spots_info[spot_index].append(url_info.get(spots_info[spot_index][0],None))
        print(f"ファイルが見つかりました!! : {pref}")
    except FileNotFoundError:
        print(f"ファイルが見つかりませんでした。:{pref}")
        spots_info = []

    return spots_info


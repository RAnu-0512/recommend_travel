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
        "熊本", "大分", "宮崎", "鹿児島", "沖縄"#,"全国"
    ]
    pref_list = ["岡山","兵庫"]
    pref_dict = {}
#    pref_dict["全国"] = []
    for pref in pref_list:
        pref_info = get_pref_spot_info(pref)
        if pref_info != []:
            pref_dict[pref] = pref_info
            # if pref_dict["全国"] != []:
            #     pref_dict["全国"] += pref_info
    return pref_dict

#県のスポットの情報を読み込む
def get_pref_spot_info(pref):
    # spots_info = {spotname:{lat:lat,lng:lng,aspects:{apsect1:{vector:vector1,spot_url:url,whichFrom:whichFrom,senti_score:senti_score,count:count,count_percentage:count_percentage},aspect2:{vector:vector2,...},..},aspectsVector:vector,numOfRev:number,},...}
    # try:
    spots_info = {}
    latlng_info_path = f"data_beta/latlng/{pref}_latlng_review_top150.csv"
    with open(latlng_info_path, 'r', encoding='utf-8') as f_latlng:
        reader = csv.reader(f_latlng)
        for row in reader:
            spot_name = row[0]
            lat = float(row[1])
            lng = float(row[2])
            spots_info[spot_name]={}
            spots_info[spot_name]["lat"] = lat
            spots_info[spot_name]["lng"] = lng
            spots_info[spot_name]["aspects"] = {}
            
    aspect_folder_path = f"./data_beta/aspects_and_vectors/{pref}/"
    read_aspectsVector_path = f"./data_beta/spots_aspect_vector/{pref}aspectVector_fromCluster_GPT.csv"

    with open(read_aspectsVector_path, 'r', newline='', encoding='utf-8') as csvfile:
        csv_reader = csv.reader(csvfile)
        for row in csv_reader:
            spot_name = row[0]
            spots_aspectVector_str = row[1]
            if spot_name in spots_info:
                spots_info[spot_name]["aspectsVector"] = [float(value) for value in spots_aspectVector_str.replace("[", "").replace("]", "").replace("\n", "").replace(",","").split()]
            
    #レビュー数を読み込みこむ
    review_num_path  = f"data_beta/number_of_review/{pref}_numOfRview.csv"
    with open(review_num_path,"r",encoding="utf-8") as f_r:
        reader = csv.reader(f_r)
        for row in reader:
            spot_name = row[0]
            numOfrev = int(row[1])
            if spot_name in spots_info:
                spots_info[spot_name]["numOfRev"] = numOfrev

    #スポットのurlを読み込む
    url_info_path = f"data_beta/url/{pref}_Spots_url_exist_3.csv"
    with open(url_info_path,"r",encoding="utf-8") as f_r:
        reader = csv.reader(f_r)
        for row in reader:
            spot_name = row[0]
            url = row[1]
            if spot_name in spots_info:
                spots_info[spot_name]["spot_url"] = url

    for spot_name,spot_info in spots_info.items():
        aspect_path = aspect_folder_path + spot_name + "aspect_from_gpt_cluster_with_embeddings.csv"
        with open(aspect_path,"r",encoding="utf-8") as f_aspect:
            reader = csv.reader(f_aspect)
            header = next(reader)
            rows = list(reader)
        for row in rows:#{apsect1:{vector:vector1,spot_url:url,whichFrom:whichFrom,senti_score:senti_score,count:count,count_percentage:count_percentage}
            aspect = row[0]
            whichFrom = row[1]
            senti_score = float(row[2])
            count = float(row[3])
            count_percentage = float(row[4])
            vector_str = row[5]
            vector_float = [float(value) for value in vector_str.replace("[", "").replace("]", "").replace("\n", "").split(",")]
            spot_info["aspects"][aspect] = {"vector":vector_float,
                                            "whichFrom":whichFrom,
                                            "senti_score":senti_score,
                                            "count":count,
                                            "count_percentage":count_percentage}
    print(f"ファイルが見つかりました!! : {pref}")
    # except FileNotFoundError:
    #     print(f"ファイルが見つかりませんでした。:{pref}")
    #     spots_info = []

    return spots_info


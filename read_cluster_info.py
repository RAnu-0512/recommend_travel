import csv

#
def get_clusterinfo():
    pref_list = [
        "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
        "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
        "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜",
        "静岡", "愛知", "三重", "滋賀", "京都", "大阪", "兵庫",
        "奈良", "和歌山", "鳥取", "島根", "岡山", "広島", "山口",
        "徳島", "香川", "愛媛", "高知", "福岡", "佐賀", "長崎",
        "熊本", "大分", "宮崎", "鹿児島", "沖縄"#,"全国"
    ]
    pref_list = ["岡山"]
    pref_dict = {}
#    pref_dict["全国"] = []
    for pref in pref_list:
        pref_cluster_info = get_pref_cluster_info(pref)
        if pref_cluster_info != []:
            pref_dict[pref] = pref_cluster_info
            # if pref_dict["全国"] != []:
            #     pref_dict["全国"] += pref_info
    return pref_dict

def get_pref_cluster_info(pref):
    read_clustering_path = f"./data_beta/all_aspect_clustering/{pref}clustering_aspectFromCluster0.99_withEmbeddings.csv"
    #クラスタリングした観点を読み込む
    clustering_aspect_dict = {}
    with open(read_clustering_path, 'r', newline='', encoding='utf-8') as csvfile:
        csv_reader = csv.reader(csvfile)
        for row in csv_reader:
            # 各行の要素数を取得
            clustering_aspect_dict[row[0]] = {"embedding":[float(value) for value in row[1].replace("[", "").replace("]", "").replace("\n", "").replace(",","").split()],"entities":row[2:]} 
    return clustering_aspect_dict
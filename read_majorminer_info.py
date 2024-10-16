import csv


def get_majorminer_info():
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
    for pref in pref_list:
        pref_cluster_info = get_pref_majorminer_info(pref)
        if pref_cluster_info != []:
            pref_dict[pref] = pref_cluster_info
            # if pref_dict["全国"] != []:
            #     pref_dict["全国"] += pref_info
    return pref_dict

def get_pref_majorminer_info(pref):
    pref_majorminer_info = {}

    major_path = f"data_beta/major_miner/{pref}major_aspects.csv"
    miner_path = f"data_beta/major_miner/{pref}miner_aspects.csv"
    major_list = []
    miner_list = []
    with open(major_path,"r",encoding="utf-8") as f_major,open(miner_path,"r",encoding="utf-8") as f_miner:
        reader_major = csv.reader(f_major)
        reader_miner = csv.reader(f_miner)
        for row in reader_major:
            major_list.append(row[0])
        for row in reader_miner:
            miner_list.append(row[0])
    
    pref_majorminer_info["major_aspects"] = major_list
    pref_majorminer_info["miner_aspects"] = miner_list
    
    return pref_majorminer_info

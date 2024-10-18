import csv


def get_allpref_info(allpref_spots_info):
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
        pref_info = get_pref_info(pref,allpref_spots_info[pref])
        if pref_info != []:
            pref_dict[pref] = pref_info
            # if pref_dict["全国"] != []:
            #     pref_dict["全国"] += pref_info
    return pref_dict

def get_pref_info(pref,spots_info):
    pref_info = {}

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
    
    pref_info["major_aspects"] = major_list
    pref_info["miner_aspects"] = miner_list
    
    numOfreview_list = []
    for spotname,spot_info in spots_info.items():
        numOfreview_list.append(spot_info["numOfRev"])
    reviewMedian = calculate_median(numOfreview_list)
    averageRviewNum = sum(numOfreview_list)/len(numOfreview_list)
    pref_info["reviewMedian"] = reviewMedian
    pref_info["averageRviewNum"] = averageRviewNum
    print(f"<{pref}>レビュー数中央値は'{reviewMedian}'です。")
    print(f"<{pref}>レビュー数平均は'{averageRviewNum}'です。")

    count_miner = 0
    count_major = 0
    for spotname,spot_info in spots_info.items():
        numOfReview = spot_info["numOfRev"]
        if numOfReview < reviewMedian:
            count_miner += 1
        else:
            count_major += 1
    print(f"<{pref}>中央値を基準にマイナースポット{count_miner}県,メジャースポット{count_major}県です。")

    count_miner = 0
    count_major = 0
    for spotname,spot_info in spots_info.items():
        numOfReview = spot_info["numOfRev"]
        if numOfReview < averageRviewNum:
            count_miner += 1
        else:
            count_major += 1
    print(f"<{pref}>平均値を基準にマイナースポット{count_miner}県,メジャースポット{count_major}県です。")
    return pref_info


# リストの中央値を計算する関数
def calculate_median(numberList):
    if not numberList:
        raise ValueError("リストが空です。中央値を計算できません。")

    # リストをソート
    sorted_list = sorted(numberList)
    n = len(sorted_list)
    mid = n // 2
    if n % 2 == 1:
        # 要素数が奇数の場合、中央の値が中央値
        median = sorted_list[mid]
    else:
        # 要素数が偶数の場合、中央の2つの値の平均が中央値
        median = (sorted_list[mid - 1] + sorted_list[mid]) / 2
    return median
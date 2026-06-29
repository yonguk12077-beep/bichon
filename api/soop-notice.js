const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const bjId = 'merryou';
    const boardNo = '82048012'; // 💡 방송공지 고유 카테고리 지정
    
    // SOOP의 실제 모바일/PC 통합 데이터 서버에 직접 요청을 보냅니다.
    const response = await axios.get(`https://bjapi.sooplive.com/api/${bjId}/board/${boardNo}/list`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    let notices = [];
    
    // SOOP 데이터 구조에서 게시글 목록 추출
    if (response.data && response.data.list) {
      const rawList = response.data.list;
      
      rawList.forEach((data) => {
        if (notices.length < 5) { // 최신 공지 최대 5개 정렬 수집
          const title = data.title || data.bbs_title;
          const titleNo = data.title_no || data.bbs_no;
          let regDate = data.reg_date || data.w_date;
          // 본문 요약 내용 매칭
          const contentPreview = data.text_content || data.content || "공지 본문 내용은 아래 원본 보기 버튼을 통해 SOOP 방송국에서 전체 내용을 확인할 수 있습니다! 🐾";

          if (title && titleNo) {
            // 날짜 포맷팅 정제 (YYYY-MM-DD)
            if (regDate && regDate.includes(' ')) {
              regDate = regDate.split(' ')[0];
            }

            notices.push({
              title: title,
              date: regDate,
              content: contentPreview,
              url: `https://www.sooplive.com/station/${bjId}/post/${titleNo}` // 💡 post/글번호 다이렉트 주소 완전 매칭
            });
          }
        }
      });
    }

    // 최신 날짜 순으로 정렬 보장
    notices.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 최종 데이터 반환
    res.status(200).json(notices);
    
  } catch (error) {
    console.error("SOOP 실시간 동기화 실패:", error);
    // 비상 상황 시 최종 방어선 주소
    res.status(200).json([
      {
        title: "📢 실시간 SOOP 방송공지 사항 타임라인 바로가기",
        date: "LIVE",
        content: "SOOP 서버와의 일시적인 통신 지연이 발생했습니다. 아래 버튼을 누르면 비숑님의 방송공지 게시판으로 직접 이동하여 최신 글을 확인할 수 있습니다!",
        url: "https://www.sooplive.com/station/merryou/board/82048012"
      }
    ]);
  }
};
$(document).ready(function () {
  // 定数定義
  const ROW_TEMPLATE = `
    <tr>
        <td data-label="名前"><input type="text" class="autocomplete-input" name="name" placeholder="名前"></td>
        <td data-label="勤務区分">
            <label><input type="radio" name="shiftType{index}" class="shiftType" value="1" checked> 日勤</label>
            <label><input type="radio" name="shiftType{index}" class="shiftType" value="2"> 時間勤務</label>
        </td>
        <td data-label="出勤時刻"><input type="time" name="startTime{index}" value="08:00" disabled></td>
        <td data-label="退勤時刻"><input type="time" name="endTime{index}" value="17:00" disabled></td>
        <td data-label="バッチテスト"><input type="checkbox" name="batchTest"></td>
        <td data-label="備考"><input type="text" name="remarks" placeholder="備考"></td>
    </tr>
  `;
  const AUTOCOMPLETE_URL = "https://script.google.com/macros/s/AKfycbxpmVaEqKuk_YU2w79Rojsc_0vBLh8aNWvCUOK61NmDi2ib672f7XqjXYtZQW8Z7GTn/exec";
  const GAS_URL = "https://script.google.com/macros/s/AKfycbyu0mCvUeOs_wMg0PZExPkK1_MnEhT4f8vdGsmoZjBo1YMg5pIovVHHYvXpg1XdCClz/exec";
  const ROWS = 15;

  // 初期処理
  // 行の動的追加
  for (let i = 0; i < ROWS; i++) {
    const rowWithIndex = ROW_TEMPLATE.replace(/{index}/g, i + 1);
    $("#attendanceTableBody").append(rowWithIndex);
  }

  // 今日の日付を設定
  document.getElementById('date').value = new Date().toISOString().split('T')[0];

  // フィールド処理
  // 勤務区分の変更監視
  $(document).on("change", ".shiftType", function () {
    const index = $(this).attr('name').replace('shiftType', '');
    const isTimeShift = $(this).val() === "2";

    $(`input[name='startTime${index}']`).prop("disabled", !isTimeShift);
    $(`input[name='endTime${index}']`).prop("disabled", !isTimeShift);
    $(`input[name='startTime${index}']`)[0].required = isTimeShift;
    $(`input[name='endTime${index}']`)[0].required = isTimeShift;
  });

  // 監視区分の変更監視
  $("input[name='workType']").change(function () {
    const isOther = $("input[name='workType']:checked").val() === "2";
    $("#nameEvent").prop("disabled", !isOther);
    $("#nameEvent").prop("required", isOther);
  });

  // 名前の入力補助
  $(".autocomplete-input").autocomplete({
    source: function (request, response) {
      $.getJSON(AUTOCOMPLETE_URL, { query: request.term }, function (data) {
        response(data.length === 0 ? ["No data"] : data);
      });
    }
  });


  // ボタン処理
  // キャッシュ再読み込み処理
  $('#reloadButton').click(function () {
    console.log("キャッシュを再取得します...");
    $.getJSON(AUTOCOMPLETE_URL, { query: "", reload: "true" }, function (data) {
      console.log("キャッシュが再取得されました");
    });
  });

  // 登録処理
  $('#registerBtn').on('click', async function () {
    try {
      if (!$('form')[0].reportValidity()) {
        $('html, body').animate({ scrollTop: 0 }, 'normal');
        return false;
      }

      $('body').css('cursor', 'wait');
      $('#overlay').show();

      const headerData = {
        type: 'header',
        date: $('#date').val(),
        location: $('input[name="location"]:checked').val(),
        recorder: $('#recorder').val(),
        supervisor: $('#supervisor').val(),
        workType: $('input[name="workType"]:checked').val(),
        nameEvent: $('input[name="workType"]:checked').val() === '2' ? $('#nameEvent').val() : ''
      };

      const details = [];
      $('#attendanceTableBody tr').each(function () {
        const name = $(this).find('input[name="name"]').val();
        if (name) {
          details.push({
            name: name,
            shiftType: $(this).find('input[name^="shiftType"]:checked').val(),
            startTime: $(this).find('input[name^="shiftType"]:checked').val() === '2'
              ? $(this).find('input[name^="startTime"]').val()
              : '',
            endTime: $(this).find('input[name^="shiftType"]:checked').val() === '2'
              ? $(this).find('input[name^="endTime"]').val()
              : '',
            batchTest: $(this).find('input[name="batchTest"]').prop('checked'),
            remarks: $(this).find('input[name="remarks"]').val()
          });
        }
      });

      const detailData = {
        type: 'detail',
        date: headerData.date,
        location: headerData.location,
        details: details
      };

      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(headerData)
      });

      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(detailData)
      });

      $('html, body').animate({ scrollTop: 0 }, 'normal');
      alert('正常に登録されました。お疲れ様です！');

    } catch (error) {
      console.error('エラーが発生しました:', error);
      alert('登録に失敗しました');
    } finally {
      $('body').css('cursor', 'default');
      $('#overlay').hide();
    }
  });
});

document.addEventListener('DOMContentLoaded', function () {
  // モーダルを表示
  const modal = document.getElementById('siteSelector');
  modal.style.display = 'block';

  // サイト選択ボタンのイベントリスナー
  const siteButtons = document.querySelectorAll('.site-buttons button');
  siteButtons.forEach(button => {
    button.addEventListener('click', function () {
      const location = this.getAttribute('location');
      const title = document.querySelector('h1');

      // 場所に応じてラジオボタンのチェックを変更
      $(`input[name="location"][value="${location}"]`).prop('checked', true);
      // 場所に応じてタイトルを変更
      switch (location) {
        case '1':
          title.textContent = '出勤簿登録サイト(森戸海岸)';
          break;
        case '2':
          title.textContent = '出勤簿登録サイト(一色海岸)';
          break;
        case '3':
          title.textContent = '出勤簿登録サイト(長者ヶ崎海岸)';
          break;
      }

      // モーダルを非表示
      modal.style.display = 'none';
    });
  });
});
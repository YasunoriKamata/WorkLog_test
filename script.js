// 定数定義
const ROW_TEMPLATE = `
    <tr>
        <td data-label="名前"><input type="text" class="autocomplete-input" name="name" placeholder="名前を選択"></td>
        <td data-label="ボランティア"><input type="checkbox" name="volunteer"></td>
        <td data-label="場所">
            <label><input type="radio" name="shiftType{index}" class="shiftType" value="1" checked> 日勤</label>
            <label><input type="radio" name="shiftType{index}" class="shiftType" value="2"> 時間勤務</label>
        </td>
        <td data-label="出勤時刻"><input type="time" name="startTime{index}" value="08:00" list="data-list" disabled></td>
        <td data-label="退勤時刻"><input type="time" name="endTime{index}" value="17:00" list="data-list" disabled></td>
        <td data-label="バッチテスト"><input type="checkbox" name="batchTest"></td>
        <td data-label="備考"><input type="text" name="remarks" placeholder="備考"></td>
    </tr>
  `;
const NAMELIST_URL = "https://script.google.com/macros/s/AKfycbxpmVaEqKuk_YU2w79Rojsc_0vBLh8aNWvCUOK61NmDi2ib672f7XqjXYtZQW8Z7GTn/exec";
const WORKLOG_URL = "https://script.google.com/macros/s/AKfycbyu0mCvUeOs_wMg0PZExPkK1_MnEhT4f8vdGsmoZjBo1YMg5pIovVHHYvXpg1XdCClz/exec";
const ROWS = 15;
let nameMasterCache = [];

$(document).ready(function () {
  // マスタデータの読み込み
  getMasterData();
  // 行の動的追加
  initRows();
  // 今日の日付を設定
  document.getElementById('date').value = getJSTISOString().slice(0, 10);
});

//名前マスタの取得
async function getMasterData() {
  //キャッシュを削除
  nameMasterCache = [];
  console.log(`マスタデータ取得開始：[${getJSTISOString()}]`);

  // オーバーレイを表示
  setLoading(true);
  try {
    const response = await fetch(NAMELIST_URL, {
      method: 'GET',
      mode: 'cors',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    nameMasterCache = await response.json();
    console.log(`マスタデータ取得完了：[${getJSTISOString()}]`);
  } catch (error) {
    console.error(`マスタデータ取得失敗：[${getJSTISOString()}]：`, error);
  } finally {
    // オーバーレイを非表示
    setLoading(false);
  }

  // オートコンプリートを再初期化
  initAutocomplete();
}
//名前の入力補助
function initAutocomplete() {
  $(".autocomplete-input").autocomplete({
    source: function (request, response) {
      const term = request.term.toLowerCase();
      const matches = nameMasterCache.filter(item =>
        item[0].toLowerCase().startsWith(term) ||
        item[1].toLowerCase().startsWith(term)
      );
      response(matches.map(item => item[0]));
    },
    minLength: 1,
    delay: 0,
    change: function (_event, ui) {
      // フォーカスを外した時に候補に一致しない場合はクリア&警告
      if (!ui.item || !availableCities.includes($(this).val())) {
        $(this).val('');
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "入力候補から選択してください",
        });
      }
    }
  });
}
// 行の動的追加
function initRows() {
  for (let i = 0; i < ROWS; i++) {
    const rowWithIndex = ROW_TEMPLATE.replace(/{index}/g, i + 1);
    $("#attendanceTableBody").append(rowWithIndex);
  }
  // 最初の行の名前は入力不可
  $('#attendanceTableBody tr:first-child input[name^="name"]').prop("disabled", true);
}

// ボタン処理
// キャッシュ再読み込み処理
async function reloadMaster() {
  try {
    setLoading(true);
    // マスタデータを再取得
    await getMasterData();

    Swal.fire({
      title: "Succcess",
      text: "マスタデータを再読込しました",
      icon: "success",
      showConfirmButton: false,
      timer: 1500
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: "マスタデータの再読込に失敗しました",
    });
  } finally {
    setLoading(false);
  }
}

// 登録処理
async function execRegist() {
  try {
    // フォームのバリデーション
    if (!$('form')[0].reportValidity()) {
      $('html, body').animate({ scrollTop: 0 }, 'normal');
      return false;
    }

    setLoading(true);
    Swal.fire({
      title: '登録中です...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    console.log(`出勤簿データ登録開始：[${getJSTISOString()}]`);

    const details = [];
    $('#attendanceTableBody tr').each(function () {
      const name = $(this).find('input[name="name"]').val();

      if (name) {
        details.push({
          name: name,
          volunteer: $(this).find('input[name="volunteer"]').prop('checked'),
          shiftType: $(this).find('input[name^="shiftType"]:checked').val(),
          startTime: $(this).find('input[name^="shiftType"]:checked').val() === '2'
            ? $(this).find('input[name^="startTime"]').val()
            : '',
          endTime: $(this).find('input[name^="shiftType"]:checked').val() === '2'
            ? $(this).find('input[name^="endTime"]').val()
            : '',
          workhours: "", // ここでは実働時間は設定しない
          batchTest: $(this).find('input[name="batchTest"]').prop('checked'),
          remarks: $(this).find('input[name="remarks"]').val()
        });
      }
    });

    const requestData = {
      type: 'regist',
      date: $('#date').val().replace(/-/g, '/'),
      location: $('input[name="location"]:checked').val(),
      recorder: $('#recorder').val(),
      supervisor: $('#supervisor').val(),
      details: details
    };

    const response = await fetch(WORKLOG_URL, {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify(requestData)
    });

    Swal.close();
    const result = await response.json();

    switch (result.status) {
      case 'success':
        // 登録成功
        console.log(`出勤簿データ登録成功：[${getJSTISOString()}]`);
        await Swal.fire({
          icon: "success",
          title: "Good job!",
          text: "正常に登録されました。お疲れ様です！",
          showConfirmButton: false,
          timer: 2000
        });
        break;
      case 'error':
        // 既存データがある場合などはここに入る
        console.log(`出勤簿データ登録失敗 既存データ有り？：[${getJSTISOString()}]`);
        Swal.fire({
          icon: "error",
          title: "Oops...",
          html: result.message,
        });
        return;
    }

    $('html, body').animate({ scrollTop: 0 }, 'normal');
  } catch (error) {
    console.error(`出勤簿データ登録失敗：[${getJSTISOString()}]：`, error);
    Swal.fire({
      icon: "error",
      title: "Oops...",
      html: error.message,
    });
  } finally {
    setLoading(false);
  }
}

//削除処理
async function execDelete() {
  const formattedDate = $('#date').val().replace(/-/g, '/');
  let msg = '';
  switch ($('input[name="location"]:checked').val()) {
    case '1':
      msg = '森戸海岸'
      break;
    case '2':
      msg = '一色海岸'
      break;
    case '3':
      msg = '長者ヶ崎海岸'
      break;
    case '4':
      msg = 'イベント'
      break;
  }

  Swal.fire({
    title: "Are you sure?",
    html: `${msg}：${formattedDate}の登録済みデータを削除します。<br>※この処理は取り消せません。`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "削除実行"
  }).then(async (result) => {
    if (result.isConfirmed) {
      setLoading(true);

      try {
        console.log(`削除処理開始：[${getJSTISOString()}]`);
        //削除データ作成
        const deleteData = {
          type: 'delete',
          date: formattedDate,
          location: $('input[name="location"]:checked').val()
        };
        //削除処理実行
        const response = await fetch(WORKLOG_URL, {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify(deleteData)
        });

        const result = await response.json();
        if (result.status === 'error') {
          //削除データがない場合などはここに入る
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: result.message,
          });
          console.log(`出勤簿データ登録失敗 削除データ無し？：[${getJSTISOString()}]`);
          return
        }

        console.log(`削除処理完了：[${getJSTISOString()}]`);
        await Swal.fire({
          title: "Deleted!",
          text: "正常に削除されました。",
          icon: "success",
          showConfirmButton: false,
          timer: 2000
        });
      } catch (error) {
        console.error(`削除処理失敗 [${getJSTISOString()}]：`, error);
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "削除処理に失敗しました",
        });
      } finally {
        setLoading(false);
      }
    }
  });
}
// 時間計算用のヘルパー関数を追加
function calculateWorkHours(startTime, endTime) {
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  const diffInMinutes = (end - start) / (1000 * 60); // ミリ秒を分に変換
  return Math.round((diffInMinutes / 60) * 100) / 100; // 時間に変換して小数点第2位まで
}
//日本時間取得
function getJSTISOString() {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // UTC+9時間をミリ秒で計算
  const jstDate = new Date(now.getTime() + jstOffset);
  return jstDate.toISOString().replace('T', ' ').slice(0, 23); // ミリ秒3桁まで
}
// ローディング表示を制御する関数
function setLoading(isLoading) {
  if (isLoading) {
    $('body').css('cursor', 'wait');
    $('#overlay').show();
  } else {
    $('#overlay').hide();
    $('body').css('cursor', 'default');
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // モーダルを表示
  const modal = document.getElementById('locationSelector');
  modal.style.display = 'block';

  // サイト選択ボタンのイベントリスナー
  const siteButtons = document.querySelectorAll('.location-buttons button');
  siteButtons.forEach(button => {
    button.addEventListener('click', async function () {
      const location = this.getAttribute('location');
      const title = document.querySelector('h1');

      // 場所に応じてラジオボタンのチェックを変更
      $(`input[name="location"][value="${location}"]`).prop('checked', true);

      // 場所に応じてタイトルを変更
      switch (location) {
        case '1':
          title.textContent += '(森戸海岸)'
          break;
        case '2':
          title.textContent += '(一色海岸)'
          break;
        case '3':
          title.textContent += '(長者ヶ崎海岸)'
          break;
        case '4':
          title.textContent += '(イベント)'
          break;
      }
      // モーダルを非表示
      modal.style.display = 'none';
    });
  });
  // 勤務区分の変更監視
  $(document).on("change", ".shiftType", function () {
    const index = $(this).attr('name').replace('shiftType', '');
    const isTimeShift = $(this).val() === "2";

    $(`input[name='startTime${index}']`).prop("disabled", !isTimeShift);
    $(`input[name='endTime${index}']`).prop("disabled", !isTimeShift);
    $(`input[name='startTime${index}']`)[0].required = isTimeShift;
    $(`input[name='endTime${index}']`)[0].required = isTimeShift;
  });

  // 監視長入力時のイベントハンドラを追加
  document.getElementById('supervisor').addEventListener('change', function (e) {
    const supervisorValue = e.target.value;

    // 入力値が有効な場合（空でない場合）
    if (supervisorValue.trim()) {
      // 明細の1行目のnameを取得して値を設定
      const nameInput = document.querySelector('#attendanceTableBody tr:first-child input[name^="name"]');
      if (nameInput) {
        nameInput.value = supervisorValue;
      }
    }
  });
});
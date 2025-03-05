$(document).ready(function () {
  // 1行分のテンプレートを用意
  const rowTemplate = `
<tr>
    <td><input type="text" class="autocomplete-input" name="name" placeholder="名前"></td>
    <td>
        <label><input type="radio" name="shiftType{index}" class="shiftType" value="1" checked> 日勤</label>
        <label><input type="radio" name="shiftType{index}" class="shiftType" value="2"> 時間勤務</label>
    </td>
    <td><input type="time" name="startTime{index}" value="08:00" disabled></td>
    <td><input type="time" name="endTime{index}" value="17:00" disabled></td>
    <td><input type="checkbox" name="batchTest"></td>
    <td><input type="text" name="remarks" placeholder="備考"></td>
</tr>
`;
  // 15行を動的に追加
  for (let i = 0; i < 15; i++) {
    // {index} を i に置き換えて動的に名前を変更
    const rowWithIndex = rowTemplate.replace(/{index}/g, i + 1);
    $("#attendanceTableBody").append(rowWithIndex);
  }

  // ラジオボタンの変更を監視
  $(document).on("change", ".shiftType", function () {
    // 現在選択された行のインデックスを取得
    const index = $(this).attr('name').replace('shiftType', '');

    // "時間勤務" が選ばれた場合
    if ($(this).val() === "2") {
      $(`input[name='startTime${index}']`).prop("disabled", false); // 出勤時間を活性化
      $(`input[name='endTime${index}']`).prop("disabled", false);   // 退勤時間を活性化
    } else {
      $(`input[name='startTime${index}']`).prop("disabled", true);  // 出勤時間を非活性化
      $(`input[name='endTime${index}']`).prop("disabled", true);    // 退勤時間を非活性化
    }
  });

  // "その他" を選んだときのみ、入力フィールドを活性化
  $("input[name='type']").change(function () {
    if ($("input[name='type']:checked").val() === "2") {
      $("#otherInput").prop("disabled", false);  // "その他" を選択したら入力フィールドを活性化
    } else {
      $("#otherInput").prop("disabled", true);   // "その他" 以外が選ばれたら入力フィールドを非活性
    }
  });

  const url = "https://script.google.com/macros/s/AKfycbxpmVaEqKuk_YU2w79Rojsc_0vBLh8aNWvCUOK61NmDi2ib672f7XqjXYtZQW8Z7GTn/exec";

  $(".autocomplete-input").autocomplete({
    source: function (request, response) {
      $.getJSON(url, { query: request.term }, function (data) {
        if (data.length === 0) {
          // 結果がない場合、「no data」を表示
          response(["No data"]);
        } else {
          // 結果があれば通常通り表示
          response(data);
        }
      });
    },
    minLength: 1,
  });

  // 再読み込みボタンが押された場合、GASからキャッシュを再取得
  $('#reloadButton').click(function () {
    console.log("キャッシュを再取得します...");
    // キャッシュを再取得するために、`reload=true` パラメータをGASに送信
    $.getJSON(url,
      { query: "", reload: "true" }, function (data) {
        console.log("キャッシュが再取得されました");
        // 再取得したデータをもとに処理を実行することもできます
        // 必要に応じて `data` を使って処理を行う
      });
  });



  // 登録処理
  $('#registerBtn').on('click', async function () {
    try {
      $('body').css('cursor', 'wait');

      //未入力項目がある場合は抜ける
      if (!$('form')[0].reportValidity()) {
        return false;
      }

      // ヘッダー情報の取得と送信
      const headerData = {
        type: 'header',  // データタイプを指定
        date: $('#date').val(),
        recorder: $('#recorder').val(),
        supervisor: $('#supervisor').val(),
        workType: $('input[name="type"]:checked').val(),
        otherInput: $('input[name="type"]:checked').val() === '2'
          ? $('#otherInput').val()
          : '' // 通常監視の場合は空文字を設定
      };

      // 明細情報の取得
      const details = [];
      $('#attendanceTableBody tr').each(function () {
        const name = $(this).find('input[name="name"]').val();
        if (name) {  // 名前が入力されている行のみ処理
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
        type: 'detail',  // データタイプを指定
        date: headerData.date,
        details: details
      };

      const GAS_URL = "https://script.google.com/macros/s/AKfycbyu0mCvUeOs_wMg0PZExPkK1_MnEhT4f8vdGsmoZjBo1YMg5pIovVHHYvXpg1XdCClz/exec";

      // ヘッダーデータの送信
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(headerData)
      });

      // 明細データの送信
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(detailData)
      });
      alert('データが正常に保存されました');

    } catch (error) {
      console.error('エラーが発生しました:', error);
      alert('データの保存に失敗しました');
    } finally {
      $('body').css('cursor', 'default');
    }
  });
});

$(document).ready(function () {
  // 1行分のテンプレートを用意
  const rowTemplate = `
<tr>
    <td><input type="text" class="autocomplete-input" name="name" placeholder="名前" required></td>
    <td>
        <label><input type="radio" name="shiftType{index}" class="shiftType" value="dayShift" checked> 日勤</label>
        <label><input type="radio" name="shiftType{index}" class="shiftType" value="timeShift"> 時間勤務</label>
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
      const rowWithIndex = rowTemplate.replace(/{index}/g, i+1);
      $("#attendanceTableBody").append(rowWithIndex);
  }

  // ラジオボタンの変更を監視
  $(document).on("change", ".shiftType", function() {
    // 現在選択された行のインデックスを取得
    const index = $(this).attr('name').replace('shiftType', '');

    // "時間勤務" が選ばれた場合
    if ($(this).val() === "timeShift") {
      $(`input[name='startTime${index}']`).prop("disabled", false); // 出勤時間を活性化
      $(`input[name='endTime${index}']`).prop("disabled", false);   // 退勤時間を活性化
    } else {
      $(`input[name='startTime${index}']`).prop("disabled", true);  // 出勤時間を非活性化
      $(`input[name='endTime${index}']`).prop("disabled", true);    // 退勤時間を非活性化
    }
  });

  // "その他" を選んだときのみ、入力フィールドを活性化
  $("input[name='type']").change(function() {
    if ($("input[name='type']:checked").val() === "other") {
      $("#otherInput").prop("disabled", false);  // "その他" を選択したら入力フィールドを活性化
    } else {
      $("#otherInput").prop("disabled", true);   // "その他" 以外が選ばれたら入力フィールドを非活性
    }
  });

  const url = "https://script.google.com/macros/s/AKfycbxpmVaEqKuk_YU2w79Rojsc_0vBLh8aNWvCUOK61NmDi2ib672f7XqjXYtZQW8Z7GTn/exec";

  $(".autocomplete-input").autocomplete({
    source: function (request, response) {
      $.getJSON(url, { query: request.term }, function (data) {
        console.log("処理に入った");
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
});
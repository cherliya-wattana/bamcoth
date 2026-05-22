param(
  [Parameter(Mandatory = $true)][string]$TemplatePath,
  [Parameter(Mandatory = $true)][string]$PayloadPath,
  [Parameter(Mandatory = $true)][string]$OutputPdfPath
)

$ErrorActionPreference = "Stop"
$culture = [System.Globalization.CultureInfo]::GetCultureInfo("th-TH")

function TextOrDots($value, $dots = "........................") {
  if ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value)) { return $dots }
  return [string]$value
}

function Money($value, $dots = ".....................") {
  if ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value)) { return $dots }
  try { return ([decimal]$value).ToString("#,##0.00", $culture) } catch { return [string]$value }
}

function DateText($value, $dots = "................") {
  if ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value)) { return $dots }
  try { return ([datetime]$value).ToString("dd/MM/yyyy", $culture) } catch { return [string]$value }
}

function HasChoice($value, $needle) {
  if ($null -eq $value) { return $false }
  if (@($value) -contains $needle) { return $true }
  return ([string]$value).Contains($needle)
}

function CheckText($selected, $label) {
  $checkedBox = [string][char]0x2611 + [string][char]0xFE0E
  $uncheckedBox = [string][char]0x2610 + [string][char]0xFE0E
  if (HasChoice $selected $label) { return "$checkedBox $label" }
  return "$uncheckedBox $label"
}

function DebtTemplateCheckLine($selected) {
  return (CheckText $selected "ประนอมหนี้ครั้งแรก") + "     " +
    (CheckText $selected "เคยประนอมหนี้แล้ว") + "     " +
    (CheckText $selected "ประนอมหนี้ส่วนที่เหลือจากการขายทอด แต่หลักประกันยังไม่ตัดชำระ")
}

function SetCell($sheet, $address, $value) {
  $sheet.Range($address).Value2 = $value
}

function ApplyBlackWhite($range) {
  $xlNone = -4142
  try { $range.Font.Color = 0 } catch {}
  try { $range.Interior.Pattern = $xlNone } catch {}
  try { $range.Borders.Color = 0 } catch {}
}

function ApplyDocumentWrapping($sheet) {
  $xlTop = -4160
  $ranges = @(
    "B8:W8",
    "G22:W22", "G24:W25", "F27:W28", "F30:W30", "R30:W30",
    "E31:W32", "B33:W35", "B36:W39",
    "B49:W54", "B57:W58", "B65:W76", "B80:W82"
  )
  foreach ($address in $ranges) {
    try {
      $range = $sheet.Range($address)
      $range.WrapText = $true
      $range.ShrinkToFit = $false
      $range.VerticalAlignment = $xlTop
    } catch {}
  }

  $compactHeights = @{
    8 = 44.4
    22 = 32.4
    24 = 36.0
    25 = 36.0
    27 = 36.0
    28 = 36.0
    30 = 36.0
    31 = 32.4
    32 = 32.4
    33 = 44.4
    37 = 23.4
    57 = 44.4
    58 = 32.4
    69 = 44.4
    70 = 44.4
    71 = 44.4
    75 = 36.0
    76 = 36.0
    80 = 44.4
    82 = 36.0
  }
  foreach ($entry in $compactHeights.GetEnumerator()) {
    try { $sheet.Rows("$($entry.Key):$($entry.Key)").RowHeight = $entry.Value } catch {}
  }

  try { $sheet.Rows("7:7").RowHeight = 22.2 } catch {}
  foreach ($rowNo in 1..105) {
    try {
      $row = $sheet.Rows("${rowNo}:${rowNo}")
      if (-not $row.Hidden -and $row.RowHeight -gt 54) { $row.RowHeight = 44.4 }
    } catch {}
  }
}

function TryUnmerge($range) {
  try {
    if ($range.MergeCells) { $range.UnMerge() | Out-Null }
  } catch {}
}

function ApplyShapeBlackWhite($sheet) {
  foreach ($shape in @($sheet.Shapes)) {
    try { $shape.Line.ForeColor.RGB = 0 } catch {}
    try { $shape.Fill.ForeColor.RGB = 16777215 } catch {}
    try { $shape.TextFrame.Characters().Font.Color = 0 } catch {}
    try { $shape.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = 0 } catch {}
  }
}

function SetCheckAt($sheet, $topLeftCell, [bool]$checked) {
  $xlOn = 1
  $xlOff = -4146
  foreach ($shape in @($sheet.Shapes)) {
    try {
      if ($shape.TopLeftCell.Address($false, $false) -eq $topLeftCell) {
        $shape.ControlFormat.Value = $(if ($checked) { $xlOn } else { $xlOff })
      }
    } catch {
      # Shape is not a form control.
    }
  }
}

function ReplacePictureFromRange($excel, $targetSheet, $pictureName, $sourceRange) {
  $shape = $null
  foreach ($item in @($targetSheet.Shapes)) {
    if ($item.Name -eq $pictureName) {
      $shape = $item
      break
    }
  }
  if ($null -eq $shape) { throw "Picture not found: $pictureName" }

  $left = $shape.Left
  $top = $shape.Top
  $width = $shape.Width
  $height = $shape.Height
  $shape.Delete()

  $xlScreen = 1
  $xlPicture = -4147
  ApplyBlackWhite $sourceRange
  $sourceRange.Worksheet.Activate() | Out-Null
  $sourceRange.CopyPicture($xlScreen, $xlPicture)
  Start-Sleep -Milliseconds 300
  $targetSheet.Activate() | Out-Null
  $newShape = $targetSheet.Pictures().Paste()
  $newShape.Left = $left
  $newShape.Top = $top
  $newShape.Width = $width
  $newShape.Height = $height
  $newShape.Name = $pictureName
}

function FillDebtRows($sheet, $startRow, $rows) {
  for ($clear = 0; $clear -lt 3; $clear++) {
    $r = $startRow + $clear
    foreach ($col in @("B","C","D","E","F","G","H","I","J","M","N","O")) {
      SetCell $sheet "$col$r" ""
    }
  }

  $maxRows = [Math]::Min(3, @($rows).Count)
  for ($i = 0; $i -lt $maxRows; $i++) {
    $r = $startRow + $i
    $row = @($rows)[$i]
    SetCell $sheet "B$r" (TextOrDots $row.accountNo "")
    SetCell $sheet "C$r" (TextOrDots $row.debtBasis "")
    SetCell $sheet "D$r" (TextOrDots $row.interestRate "")
    SetCell $sheet "E$r" (Money $row.principal "")
    SetCell $sheet "F$r" (Money $row.interest "")
    SetCell $sheet "G$r" (Money $row.totalDebt "")
    SetCell $sheet "H$r" (Money $row.dayOne "")
    SetCell $sheet "I$r" (Money $row.dayOneYield "")
    SetCell $sheet "J$r" (TextOrDots $row.collateral "")
    SetCell $sheet "M$r" (Money $row.bamAppraisal "")
    SetCell $sheet "N$r" (TextOrDots $row.enforcementStatus "")
    SetCell $sheet "O$r" (TextOrDots $row.note "")
  }
}

function FillPaymentLine($sheet, $rowNo, $line) {
  SetCell $sheet "H$rowNo" (Money $line.principal "")
  SetCell $sheet "I$rowNo" (Money $line.interest "")
  SetCell $sheet "J$rowNo" (Money $line.fee "")
  SetCell $sheet "K$rowNo" (Money $line.total "")
  SetCell $sheet "L$rowNo" (Money $line.expense "")
  SetCell $sheet "M$rowNo" (Money $line.dayOne "")
  SetCell $sheet "N$rowNo" (Money $line.yield "")
  SetCell $sheet "O$rowNo" (Money $line.costFee "")
  SetCell $sheet "P$rowNo" (Money $line.costTotal "")
}

$payload = Get-Content -Raw -LiteralPath $PayloadPath -Encoding UTF8 | ConvertFrom-Json
$workbookPath = [System.IO.Path]::Combine([System.IO.Path]::GetDirectoryName($OutputPdfPath), "workbook.xlsx")
Copy-Item -LiteralPath $TemplatePath -Destination $workbookPath -Force

$excel = $null
$workbook = $null
try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $excel.ScreenUpdating = $false

  $workbook = $excel.Workbooks.Open($workbookPath)
  $ws = $workbook.Worksheets.Item("ใบสรุปนำเสนอ(ปนน.)")
  $s11 = $workbook.Worksheets.Item("1.1 ภาระหนี้-หลักประกัน")
  $s14 = $workbook.Worksheets.Item("1.4 อนุมัติเดิม - ผลชำระหนี้")
  $s31 = $workbook.Worksheets.Item("3.1 ภาพรวมบริหารหนี้")
  ApplyBlackWhite $ws.UsedRange
  ApplyBlackWhite $s11.UsedRange
  ApplyBlackWhite $s14.UsedRange
  ApplyBlackWhite $s31.UsedRange
  ApplyShapeBlackWhite $ws

  TryUnmerge $ws.Range("Q2:W3")
  TryUnmerge $ws.Range("B4:C4")
  TryUnmerge $ws.Range("B5:C5")
  SetCell $ws "J2" ""
  SetCell $ws "B7" ("  ลูกหนี้กลุ่ม / ราย " + (TextOrDots $payload.debtorName ""))
  SetCell $ws "N7" ("Port " + (TextOrDots $payload.portfolio ""))
  SetCell $ws "R7" ("Client " + (TextOrDots $payload.clientCode ""))
  SetCell $ws "U7" ("วันรับโอน " + (DateText $payload.transferDate ""))
  SetCell $ws "B8" ("  วัตถุประสงค์ " + (TextOrDots $payload.objective ""))
  SetCell $ws "E10" (TextOrDots $payload.department "พัฒนาสินทรัพย์ ......")
  SetCell $ws "O10" (TextOrDots $payload.team "พัฒนาสินทรัพย์ ......")

  SetCheckAt $ws "B4" (HasChoice $payload.recipients "คณะกรรมการบริษัท")
  SetCheckAt $ws "H4" (HasChoice $payload.recipients "คณะกรรมการบริหาร")
  SetCheckAt $ws "B5" (HasChoice $payload.recipients "คณะกรรมการพัฒนาสินทรัพย์")
  SetCheckAt $ws "H5" (HasChoice $payload.recipients "คณะอนุกรรมการพัฒนาสินทรัพย์")
  SetCheckAt $ws "O5" (HasChoice $payload.recipients "อื่นๆ")
  SetCell $ws "B4" ((CheckText $payload.recipients "คณะกรรมการบริษัท") + "     " + (CheckText $payload.recipients "คณะกรรมการบริหาร"))
  SetCell $ws "H4" ""
  SetCell $ws "B5" ((CheckText $payload.recipients "คณะกรรมการพัฒนาสินทรัพย์") + "     " + (CheckText $payload.recipients "คณะอนุกรรมการพัฒนาสินทรัพย์") + "     " + (CheckText $payload.recipients "อื่นๆ"))
  SetCell $ws "H5" ""
  SetCell $ws "O5" ""
  if (HasChoice $payload.recipients "อื่นๆ") {
    SetCell $ws "P5" ("อื่นๆ " + (TextOrDots $payload.otherRecipientText ""))
  }
  SetCheckAt $ws "Q2" (HasChoice $payload.purposeFor "ทราบ")
  SetCheckAt $ws "S2" (HasChoice $payload.purposeFor "สัตยาบัน")
  SetCheckAt $ws "U2" (HasChoice $payload.purposeFor "พิจารณา")
  SetCell $ws "Q2" ("เพื่อ   " + (CheckText $payload.purposeFor "ทราบ") + "   " + (CheckText $payload.purposeFor "สัตยาบัน") + "   " + (CheckText $payload.purposeFor "พิจารณา"))
  SetCell $ws "Q3" ""
  $ws.Range("Q2:W2").Merge() | Out-Null
  $purposeBox = $ws.Range("Q2:W2")
  ApplyBlackWhite $purposeBox
  $purposeBox.HorizontalAlignment = -4152
  $purposeBox.BorderAround(1, 2, 1, 0) | Out-Null
  $learnBox = $ws.Range("A4:W5")
  ApplyBlackWhite $learnBox
  $learnBox.Borders.LineStyle = -4142
  $metaBox = $ws.Range("A7:W10")
  ApplyBlackWhite $metaBox
  $ws.Range("A7:W8").Borders.LineStyle = -4142
  $ws.Range("A7:W8").BorderAround(1, 2, 1, 0) | Out-Null
  $ws.Range("A8:W8").Borders.Item(9).LineStyle = 1
  $ws.Range("A8:W8").Borders.Item(9).Weight = 2
  SetCell $ws "A8" "วัตถุประสงค์ :"
  $ws.Range("A9:W10").Borders.LineStyle = -4142
  $ws.Range("A9:W9").Borders.Item(8).LineStyle = 1
  $ws.Range("A9:W9").Borders.Item(8).Weight = 2
  foreach ($addr in @("B7", "N7", "R7", "U7", "B8")) {
    try { $ws.Range($addr).Font.Underline = 2 } catch {}
  }
  try { $ws.Range("A8").Font.Bold = $true } catch {}
  try { $ws.Range("B8").Font.Bold = $false } catch {}
  try { $ws.Range("A10").WrapText = $false } catch {}
  try { $ws.Range("A10:W10").Font.Bold = $true } catch {}
  foreach ($sectionRange in @("A11:W11", "A56:W56", "A79:W79")) {
    try {
      $range = $ws.Range($sectionRange)
      $range.Font.Size = 10
      $range.Font.Bold = $true
      $range.Font.Underline = 2
    } catch {}
  }
  $bodyBox = $ws.Range("A11:W101")
  ApplyBlackWhite $bodyBox
  $bodyBox.BorderAround(1, 2, 1, 0) | Out-Null
  $ws.Rows("13:13").Hidden = $false
  $ws.Rows("13:13").RowHeight = 18
  SetCell $ws "B13" (DebtTemplateCheckLine $payload.debtTemplate)
  try {
    $templateChoiceLine = $ws.Range("B13:W13")
    ApplyBlackWhite $templateChoiceLine
    $templateChoiceLine.Font.Size = 9
    $templateChoiceLine.WrapText = $false
    $templateChoiceLine.ShrinkToFit = $true
    $templateChoiceLine.HorizontalAlignment = -4131
  } catch {}

  switch -Wildcard ($payload.debtTemplate) {
    "*ครั้งแรก*" {
      FillDebtRows $s11 19 $payload.debtRows
      SetCell $s11 "B13" (DebtTemplateCheckLine $payload.debtTemplate)
      $debtRange = $s11.Range("B14:O23")
    }
    "*ส่วนที่เหลือ*" {
      FillDebtRows $s11 30 $payload.debtRows
      SetCell $s11 "B25" (DebtTemplateCheckLine $payload.debtTemplate)
      $debtRange = $s11.Range("B26:O36")
    }
    default {
      FillDebtRows $s11 7 $payload.debtRows
      SetCell $s11 "B2" (DebtTemplateCheckLine $payload.debtTemplate)
      $debtRange = $s11.Range("B3:O11")
    }
  }
  ReplacePictureFromRange $excel $ws "Picture 1" $debtRange

  SetCheckAt $ws "B22" ([bool]$payload.case.noCase)
  SetCell $ws "B22" (CheckText @($(if ([bool]$payload.case.noCase) { "ยังไม่มีการดำเนินคดี" })) "ยังไม่มีการดำเนินคดี")
  SetCell $ws "G22" ("สัญญากู้" + (TextOrDots $payload.case.loanContractNo ".......................") + " วันที่" + (DateText $payload.case.loanContractDate))
  SetCheckAt $ws "B24" ([bool]$payload.case.civil)
  SetCell $ws "B24" (CheckText @($(if ([bool]$payload.case.civil) { "คดีแพ่ง" })) "คดีแพ่ง")
  SetCell $ws "G24" ("คดีหมายเลขดำที่" + (TextOrDots $payload.case.civilBlackNo "........................."))
  SetCell $ws "M24" ("วันที่ฟ้อง" + (DateText $payload.case.filingDate))
  SetCell $ws "G25" ("คดีหมายเลขแดงที่" + (TextOrDots $payload.case.civilRedNo "........................."))
  SetCell $ws "M25" ("วันที่พิพากษา" + (DateText $payload.case.judgmentDate))
  SetCheckAt $ws "G26" (HasChoice $payload.case.rightSubrogationStatus "ศาลอนุญาต")
  SetCheckAt $ws "O26" (HasChoice $payload.case.rightSubrogationStatus "ยังไม่อนุญาต")
  SetCheckAt $ws "B27" ([bool]$payload.case.preferential)
  SetCell $ws "B27" (CheckText @($(if ([bool]$payload.case.preferential) { "คดีบุริมสิทธิ" })) "คดีบุริมสิทธิ")
  SetCell $ws "F27" ("คดีหมายเลขแดงที่" + (TextOrDots $payload.case.preferentialRedNo "........................."))
  SetCell $ws "L27" ("โจทก์" + (TextOrDots $payload.case.plaintiff "............."))
  SetCheckAt $ws "N27" (HasChoice $payload.case.preferentialStatus "ยังไม่ยื่น")
  SetCheckAt $ws "R27" (HasChoice $payload.case.preferentialStatus "ยื่น")
  SetCheckAt $ws "G28" (HasChoice $payload.case.preferentialOrderStatus "มีคำสั่ง")
  SetCheckAt $ws "O28" (HasChoice $payload.case.preferentialOrderStatus "ยังไม่มี")
  SetCheckAt $ws "B30" ([bool]$payload.case.bankruptcy)
  SetCell $ws "B30" (CheckText @($(if ([bool]$payload.case.bankruptcy) { "คดีล้มละลาย" })) "คดีล้มละลาย")
  SetCell $ws "F30" ("(ตรวจสอบข้อมูล ณ วันที่" + (DateText $payload.case.bankruptcyCheckDate) + ")")
  SetCheckAt $ws "N30" (-not [bool]$payload.case.bankruptcyFound)
  SetCheckAt $ws "P30" ([bool]$payload.case.bankruptcyFound)
  SetCell $ws "R30" ("(รายละเอียดตามเอกสารแนบ " + (TextOrDots $payload.case.bankruptcyDetail "") + ")")

  SetCell $ws "E31" ("อายุ" + (TextOrDots $payload.debtorInfo.debtorAge) + " อาชีพ" + (TextOrDots $payload.debtorInfo.debtorOccupation) + " รายได้" + (Money $payload.debtorInfo.debtorIncome) + "บาท/เดือน    รายจ่าย" + (Money $payload.debtorInfo.debtorExpense) + "บาท/เดือน")
  SetCell $ws "E32" ("อายุ" + (TextOrDots $payload.debtorInfo.guarantorAge) + " อาชีพ" + (TextOrDots $payload.debtorInfo.guarantorOccupation) + " รายได้" + (Money $payload.debtorInfo.guarantorIncome) + "บาท/เดือน    รายจ่าย" + (Money $payload.debtorInfo.guarantorExpense) + "บาท/เดือน")
  SetCell $ws "B33" (" - การเจรจา :  " + (TextOrDots $payload.debtorInfo.negotiation ""))

  if (@($payload.approvalHistory).Count -gt 0) {
    $firstApproval = @($payload.approvalHistory)[0]
    SetCell $s14 "B4" (" 1. " + (TextOrDots $firstApproval.approval "คพส.ครั้งที่ ....... วันที่ ..............................."))
    SetCell $s14 "D4" (TextOrDots $firstApproval.progress "")
    SetCell $ws "B37" (" - สรุปคำอนุมัติเดิม " + (TextOrDots $firstApproval.approval ""))
  }
  FillPaymentLine $s14 13 $payload.paymentSummary.restructureDebt
  FillPaymentLine $s14 14 $payload.paymentSummary.compromiseAmount
  FillPaymentLine $s14 15 $payload.paymentSummary.paidAmount
  FillPaymentLine $s14 16 $payload.paymentSummary.beforeCancel
  FillPaymentLine $s14 17 $payload.paymentSummary.afterCancelToPresent
  FillPaymentLine $s14 18 $payload.paymentSummary.clause4InterestToPresent
  FillPaymentLine $s14 19 $payload.paymentSummary.currentOffer
  ReplacePictureFromRange $excel $ws "Picture 9" $s14.Range("G9:P20")
  $ws.Rows("48:55").Hidden = $true

  SetCheckAt $ws "E48" (HasChoice $payload.assetSearch.status "ไม่พบ")
  SetCheckAt $ws "I48" (HasChoice $payload.assetSearch.status "พบ")
  SetCheckAt $ws "M48" (HasChoice $payload.assetSearch.status "อื่น")
  SetCell $ws "B49" ("ข้อมูลทรัพย์สินอื่น: จำนวน  " + (TextOrDots $payload.assetSearch.otherAssetCount ".....") + "   แปลง ราคาประเมินรวม " + (Money $payload.assetSearch.otherAssetAppraisal ".................................") + " บาท")
  SetCell $ws "B50" ("ผลการตรวจสอบข้อมูลภาระหนี้อื่น ตามแบบยืนยันภาระหนี้เกณฑ์สิทธิ์ ลว. " + (DateText $payload.otherDebtCheck.date ".........................") + "  ")
  SetCheckAt $ws "P50" (HasChoice $payload.otherDebtCheck.status "ไม่พบ")
  SetCheckAt $ws "R50" (HasChoice $payload.otherDebtCheck.status "พบ")
  SetCell $ws "S50" ("พบ รวม " + (TextOrDots $payload.otherDebtCheck.accountCount "....") + " บัญชี")
  SetCheckAt $ws "R51" (HasChoice $payload.amloAndSigning.status "ครบถ้วน")
  SetCheckAt $ws "T51" (HasChoice $payload.amloAndSigning.status "ไม่ครบถ้วน")
  SetCell $ws "B53" ("ประมาณการค่าใช้จ่ายทั้งหมด" + (Money $payload.futureExpense.total) + " บาท    แบ่งเป็นค่าใช้จ่ายในระบบ" + (Money $payload.futureExpense.system) + "บาท   และค่าใช้จ่ายในอนาคตรวม" + (Money $payload.futureExpense.future) + "บาท")
  $ws.Rows("48:55").Hidden = $true

  SetCell $ws "B57" ("ขออนุมัติรับชำระหนี้จำนวน" + (Money $payload.proposal.amount) + " บาท (เงินต้น" + (Money $payload.proposal.principal) + "บาท ,ดอกเบี้ยค้างเดิม" + (Money $payload.proposal.oldInterest) + "บาท) ภายในเดือน" + (TextOrDots $payload.proposal.withinMonth) + "ดังนี้")
  SetCell $ws "C58" ("คิดดอกเบี้ย" + (TextOrDots $payload.proposal.interestRate ".......") + "% ต่อปี   นับตั้งแต่วันที่" + (DateText $payload.proposal.interestStartDate))

  $installRows = @($payload.proposal.installments)
  for ($i = 0; $i -lt [Math]::Min(3, $installRows.Count); $i++) {
    $targetRow = 61 + $i
    $row = $installRows[$i]
    SetCell $ws "C$targetRow" (TextOrDots $row.period "")
    SetCell $ws "F$targetRow" (TextOrDots $row.duration "")
    SetCell $ws "K$targetRow" (Money $row.amount "")
  }

  SetCell $ws "B69" ("   2.2.1  " + (TextOrDots $payload.proposal.condition221 "ถอนการยึด/ ไถ่ถอนจำนอง.......................................คืนให้แก่ลูกหนี้ โดยลูกหนี้เป็นผู้รับผิดชอบค่าใช้จ่ายในการถอนยึด / ไถ่ถอน ทั้งหมด"))
  SetCell $ws "B70" ("   2.2.2 " + (TextOrDots $payload.proposal.condition222 "ถอนคำขอเฉลี่ยทรัพย์สืบพบ คดีหมายเลขแดงที่............/ถอนคำรับชำระหนี้คดีล้มละลายหมายเลขแดงที่ ................ (ถ้ามี)"))
  SetCell $ws "B71" ("   2.2.3 " + (TextOrDots $payload.proposal.condition223 "ถือเป็นการชำระหนี้เสร็จสิ้น ตามสัญญากู้...........ฉบับลงวันที่.......... หรือ คำพิพากษาคดีหมายเลขแดงที่............../คดีล้มละลายหมายเลขแดงที่............ (แล้วแต่กรณี)"))
  SetCell $ws "B75" ("ขออนุมัติยกเว้นการลงนาม" + (TextOrDots $payload.proposal.exemptionText "............................"))
  SetCell $ws "B76" ("รายงานเพื่อทราบวันครบระยะเวลาบังคับคดีวันที่" + (DateText $payload.proposal.enforcementEndDate "...................."))

  SetCell $ws "B80" (TextOrDots $payload.presenterOpinion.opinion "")
  SetCell $ws "B82" ("เหตุผลเพิ่มเติม (ถ้ามี) " + (TextOrDots $payload.presenterOpinion.reason ""))

  SetCell $s31 "G6" (Money $payload.managementOverview.paid "")
  SetCell $s31 "G7" (Money $payload.managementOverview.auctionReceived "")
  SetCell $s31 "G8" (Money $payload.managementOverview.collateralEstimate "")
  SetCell $s31 "G10" (Money $payload.managementOverview.thirdPartyAuction "")
  SetCell $s31 "G12" (Money $payload.managementOverview.npaEstimate "")
  SetCell $s31 "G13" (Money $payload.managementOverview.currentOffer "")
  SetCell $s31 "H13" (TextOrDots $payload.managementOverview.currentOfferPercent "")
  SetCell $s31 "G15" (Money $payload.managementOverview.dayOne "")
  SetCell $s31 "G16" (Money $payload.managementOverview.systemExpense "")
  SetCell $s31 "G17" (Money $payload.managementOverview.futureExpense "")
  SetCell $s31 "G18" (Money $payload.managementOverview.commonFee "")
  SetCell $s31 "G19" (Money $payload.managementOverview.nplTransferExpense "")
  SetCell $s31 "G20" (Money $payload.managementOverview.npaTransferExpense "")
  SetCell $s31 "G21" (Money $payload.managementOverview.purchaseFee "")
  SetCell $s31 "H21" (TextOrDots $payload.managementOverview.purchaseFeePercent "")
  SetCell $s31 "H23" (Money $payload.managementOverview.surplus "")
  SetCell $s31 "I23" (TextOrDots $payload.managementOverview.surplusPercentText "")
  ReplacePictureFromRange $excel $ws "Picture 4" $s31.Range("A1:I23")

  SetCell $ws "C105" (TextOrDots $payload.signers.presenterPosition "ตำแหน่ง..........................")
  SetCell $ws "K105" (TextOrDots $payload.signers.managerGroup "ผู้จัดการกลุ่มพัฒนาสินทรัพย์ ....")
  SetCell $ws "S105" (TextOrDots $payload.signers.directorDepartment "ผู้อำนวยการฝ่ายพัฒนาสินทรัพย์")
  $signatureBox = $ws.Range("A101:W105")
  ApplyBlackWhite $signatureBox
  $signatureBox.BorderAround(1, 2, 1, 0) | Out-Null
  ApplyDocumentWrapping $ws

  $ws.PageSetup.PrintArea = '$A$1:$W$105'
  $ws.PageSetup.Orientation = 1
  $ws.PageSetup.PaperSize = 9
  $ws.PageSetup.Zoom = $false
  $ws.PageSetup.FitToPagesWide = 1
  $ws.PageSetup.FitToPagesTall = 3
  $ws.PageSetup.LeftMargin = 0
  $ws.PageSetup.RightMargin = 0
  $ws.PageSetup.CenterFooter = "เอกสาร ใช้ภายในบริษัท โดย เชาวนะ สัดดวัชรวงศ์ (Chaowana Sattawatcharawong)"
  $ws.PageSetup.RightFooter = "หน้า &P/&N"

  $workbook.Save()
  $xlTypePDF = 0
  $xlQualityStandard = 0
  $ws.ExportAsFixedFormat($xlTypePDF, $OutputPdfPath, $xlQualityStandard, $true, $false)
}
finally {
  if ($null -ne $workbook) { $workbook.Close($false) | Out-Null }
  if ($null -ne $excel) {
    $excel.Quit() | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
  }
}



















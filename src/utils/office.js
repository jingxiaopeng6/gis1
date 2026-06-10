import { zipSync, strToU8 } from 'fflate'
import {
  buildOfficeReportHtml,
  buildReportRows,
  buildReportVectorSvg,
  buildSourceEntries,
  escapeXml,
  getReportSubtitle,
  getReportTitle,
} from './report'

function dataUriToU8(dataUri) {
  if (!dataUri) return null
  const base64 = String(dataUri).split(',')[1] || ''
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function pngSizeFromDataUri(dataUri) {
  const bytes = dataUriToU8(dataUri)
  if (!bytes || bytes.length < 24) return { width: 1600, height: 900 }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0) !== 0x89504e47) return { width: 1600, height: 900 }
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  }
}

async function loadImageFromDataUri(dataUri) {
  if (!dataUri) return null
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUri
  })
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/)
  const lines = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawCard(ctx, x, y, w, h, title, items) {
  ctx.fillStyle = 'rgba(30, 41, 59, 0.88)'
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 2
  roundRect(ctx, x, y, w, h, 28)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#E2E8F0'
  ctx.font = 'bold 28px Arial, sans-serif'
  ctx.fillText(title, x + 28, y + 42)

  let cursorY = y + 84
  for (const item of items) {
    ctx.fillStyle = '#F8FAFC'
    ctx.font = 'bold 20px Arial, sans-serif'
    ctx.fillText(item.label, x + 28, cursorY)
    cursorY += 26
    ctx.fillStyle = '#CBD5E1'
    ctx.font = '18px Arial, sans-serif'
    for (const line of wrapText(ctx, item.value, w - 56)) {
      ctx.fillText(line, x + 28, cursorY)
      cursorY += 22
    }
    if (item.note) {
      ctx.fillStyle = '#94A3B8'
      ctx.font = '16px Arial, sans-serif'
      for (const line of wrapText(ctx, item.note, w - 56)) {
        ctx.fillText(line, x + 28, cursorY)
        cursorY += 20
      }
    }
    cursorY += 12
    if (cursorY > y + h - 40) break
  }
}

async function renderReportCanvas(report) {
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = 2260
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, '#0F172A')
  gradient.addColorStop(1, '#111827')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const pad = 72
  ctx.fillStyle = '#E2E8F0'
  ctx.font = 'bold 44px Arial, sans-serif'
  ctx.fillText(report.title, pad, 96)
  ctx.fillStyle = '#94A3B8'
  ctx.font = '24px Arial, sans-serif'
  ctx.fillText(report.subtitle, pad, 142)

  const snapshotImg = await loadImageFromDataUri(report.snapshotDataUri)
  const heroX = pad
  const heroY = 190
  const heroW = 980
  const heroH = 620
  ctx.fillStyle = 'rgba(30, 41, 59, 0.86)'
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 2
  roundRect(ctx, heroX, heroY, heroW, heroH, 28)
  ctx.fill()
  ctx.stroke()

  if (snapshotImg) {
    const aspect = snapshotImg.width / Math.max(1, snapshotImg.height)
    let drawW = heroW - 36
    let drawH = drawW / aspect
    if (drawH > heroH - 36) {
      drawH = heroH - 36
      drawW = drawH * aspect
    }
    const drawX = heroX + (heroW - drawW) / 2
    const drawY = heroY + (heroH - drawH) / 2
    ctx.drawImage(snapshotImg, drawX, drawY, drawW, drawH)
  } else {
    ctx.fillStyle = '#94A3B8'
    ctx.font = '24px Arial, sans-serif'
    ctx.fillText('No snapshot available', heroX + 40, heroY + 60)
  }

  const rows = report.rows || []
  drawCard(ctx, 1100, 190, 428, 620, 'Key Metrics', rows.slice(0, 8).map(([label, value]) => ({ label, value })))
  drawCard(ctx, 72, 860, 1456, 560, 'Data Sources', buildSourceEntries(report).slice(0, 8))

  ctx.fillStyle = '#94A3B8'
  ctx.font = '20px Arial, sans-serif'
  ctx.fillText('Generated entirely in browser', pad, canvas.height - 60)

  return canvas.toDataURL('image/jpeg', 0.94)
}

function bytesConcat(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function buildPdfFromJpeg(imageBytes, width, height) {
  const encoder = new TextEncoder()
  const objects = []

  const obj = (body) => {
    const bytes = body instanceof Uint8Array ? body : encoder.encode(String(body))
    objects.push(bytes)
    return objects.length
  }

  const imgObj = obj(
    bytesConcat([
      encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`),
      imageBytes,
      encoder.encode('\nendstream'),
    ])
  )
  const contentStream = encoder.encode('q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ\n')
  const contentObj = obj(
    bytesConcat([encoder.encode(`<< /Length ${contentStream.length} >>\nstream\n`), contentStream, encoder.encode('endstream')])
  )
  const fontObj = obj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const pageObj = obj(`<< /Type /Page /Parent 5 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${imgObj} 0 R >> /Font << /F1 ${fontObj} 0 R >> >> /Contents ${contentObj} 0 R >>`)
  const pagesObj = obj(`<< /Type /Pages /Kids [${pageObj} 0 R] /Count 1 >>`)
  const catalogObj = obj(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`)

  const header = encoder.encode('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n')
  const chunks = [header]
  const offsets = [0]
  let offset = header.length

  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(offset)
    const prefix = encoder.encode(`${i + 1} 0 obj\n`)
    const suffix = encoder.encode('\nendobj\n')
    chunks.push(prefix, objects[i], suffix)
    offset += prefix.length + objects[i].length + suffix.length
  }

  const xrefStart = offset
  const xrefLines = [`xref\n0 ${objects.length + 1}\n`, '0000000000 65535 f \n']
  for (let i = 1; i < offsets.length; i += 1) {
    xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`)
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObj} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  chunks.push(encoder.encode(xrefLines.join('')), encoder.encode(trailer))
  return bytesConcat(chunks)
}

function buildDocxFiles(report) {
  const title = getReportTitle(report?.selectedRegion)
  const subtitle = getReportSubtitle(report?.selectedRegion)
  const rows = buildReportRows(report)
  const imageBytes = dataUriToU8(report?.snapshotDataUri)
  const hasImage = !!imageBytes
  const imageSize = report?.snapshotDataUri ? pngSizeFromDataUri(report.snapshotDataUri) : { width: 1600, height: 900 }
  const imageMaxWidth = 5200000
  const aspect = imageSize.width / Math.max(1, imageSize.height)
  const imageWidth = imageMaxWidth
  const imageHeight = Math.max(1200000, Math.round(imageWidth / aspect))

  const rowsXml = rows
    .map(
      ([key, value]) => `
      <w:tr>
        <w:tc><w:p><w:r><w:t>${escapeXml(key)}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>${escapeXml(value)}</w:t></w:r></w:p></w:tc>
      </w:tr>`
    )
    .join('')

  const sourceEntries = buildSourceEntries(report)
  const sourceRows = sourceEntries
    .slice(0, 6)
    .map(
      (item) => `
      <w:p>
        <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(`${item.label}: ${item.value}${item.note ? ` - ${item.note}` : ''}`)}</w:t></w:r>
      </w:p>`
    )
    .join('')

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>${escapeXml(title)}</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/><w:color w:val="6B7280"/></w:rPr><w:t>${escapeXml(subtitle)}</w:t></w:r></w:p>
    ${
      hasImage
        ? `
    <w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="${imageWidth}" cy="${imageHeight}" />
      <wp:docPr id="1" name="Snapshot" />
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic>
            <pic:nvPicPr><pic:cNvPr id="1" name="Snapshot" /><pic:cNvPicPr /></pic:nvPicPr>
            <pic:blipFill><a:blip r:embed="rId1" /><a:stretch><a:fillRect /></a:stretch></pic:blipFill>
            <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${imageWidth}" cy="${imageHeight}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst /></a:prstGeom></pic:spPr>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </wp:inline></w:drawing></w:r></w:p>`
        : ''
    }
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Key Metrics</w:t></w:r></w:p>
    <w:tbl>
      <w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>
      </w:tblBorders></w:tblPr>
      <w:tblGrid><w:gridCol w:w="2400"/><w:gridCol w:w="6200"/></w:tblGrid>
      ${rowsXml}
    </w:tbl>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Data Sources</w:t></w:r></w:p>
    ${sourceRows}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${hasImage ? '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>' : ''}
</Relationships>`

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:sz w:val="21"/></w:rPr>
  </w:style>
</w:styles>`

  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:subject>${escapeXml(subtitle)}</dc:subject>
  <dc:creator>Terrain 3D Viewer</dc:creator>
  <cp:lastModifiedBy>Terrain 3D Viewer</cp:lastModifiedBy>
</cp:coreProperties>`

  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Terrain 3D Viewer</Application>
</Properties>`

  return {
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(rootRels),
    'word/document.xml': strToU8(documentXml),
    'word/_rels/document.xml.rels': strToU8(docRels),
    'word/styles.xml': strToU8(styles),
    'docProps/core.xml': strToU8(core),
    'docProps/app.xml': strToU8(app),
    ...(hasImage ? { 'word/media/image1.png': imageBytes } : {}),
  }
}

function buildPptxFiles(report) {
  const title = getReportTitle(report?.selectedRegion)
  const subtitle = getReportSubtitle(report?.selectedRegion)
  const rows = buildReportRows(report)
  const imageBytes = dataUriToU8(report?.snapshotDataUri)
  const hasImage = !!imageBytes
  const imageSize = report?.snapshotDataUri ? pngSizeFromDataUri(report.snapshotDataUri) : { width: 1600, height: 900 }
  const slideW = 9144000
  const slideH = 5143500
  const imgLeft = 400000
  const imgTop = 1100000
  const imgWidth = 5200000
  const imgHeight = Math.max(2200000, Math.round((imgWidth * imageSize.height) / Math.max(1, imageSize.width)))
  const textLeft = 5900000

  const sourceEntries = buildSourceEntries(report)
  const bulletXml = [
    ...rows.slice(0, 6).map(([key, value]) => `${key}: ${value}`),
    ...sourceEntries.slice(0, 4).map((item) => `${item.label}: ${item.value}`),
  ]
    .map(
      (text) => `
        <a:p>
          <a:pPr lvl="0"/>
          <a:r><a:rPr sz="1500" lang="zh-CN"/><a:t>${escapeXml(text)}</a:t></a:r>
        </a:p>`
    )
    .join('')

  const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:bg>
      <p:bgPr><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill></p:bgPr>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm><a:off x="0" y="0"/><a:ext cx="${slideW}" cy="${slideH}"/><a:chOff x="0" y="0"/><a:chExt cx="${slideW}" cy="${slideH}"/></a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="430000" y="240000"/><a:ext cx="7800000" cy="620000"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square"/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr sz="2800" b="1" lang="zh-CN"/><a:t>${escapeXml(title)}</a:t></a:r></a:p>
          <a:p><a:r><a:rPr sz="1200" lang="zh-CN"/><a:solidFill><a:srgbClr val="94A3B8"/></a:solidFill><a:t>${escapeXml(subtitle)}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      ${
        hasImage
          ? `
      <p:pic>
        <p:nvPicPr><p:cNvPr id="3" name="Snapshot"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
        <p:spPr><a:xfrm><a:off x="${imgLeft}" y="${imgTop}"/><a:ext cx="${imgWidth}" cy="${imgHeight}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
      </p:pic>`
          : ''
      }
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Notes"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="${textLeft}" y="1120000"/><a:ext cx="2700000" cy="3000000"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>${bulletXml}</p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`

  const presentation = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId2"/>
  </p:sldIdLst>
  <p:slideSize cx="9144000" cy="5143500"/>
  <p:notesSize cx="6858000" cy="9144000"/>
</p:presentation>`

  const presentationRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`

  const slideRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${hasImage ? '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>' : ''}
</Relationships>`

  const slideLayout = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
             type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="5143500"/><a:chOff x="0" y="0"/><a:chExt cx="9144000" cy="5143500"/></a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`

  const slideLayoutRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`

  const slideMaster = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="5143500"/><a:chOff x="0" y="0"/><a:chExt cx="9144000" cy="5143500"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
  <p:txStyles/>
</p:sldMaster>`

  const slideMasterRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`

  const theme = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="1F497D"/></a:dk2>
      <a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
      <a:accent1><a:srgbClr val="4F81BD"/></a:accent1>
      <a:accent2><a:srgbClr val="C0504D"/></a:accent2>
      <a:accent3><a:srgbClr val="9BBB59"/></a:accent3>
      <a:accent4><a:srgbClr val="8064A2"/></a:accent4>
      <a:accent5><a:srgbClr val="4BACC6"/></a:accent5>
      <a:accent6><a:srgbClr val="F79646"/></a:accent6>
      <a:hlink><a:srgbClr val="0000FF"/></a:hlink>
      <a:folHlink><a:srgbClr val="800080"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont><a:latin typeface="Aptos"/><a:ea typeface="Aptos"/><a:cs typeface="Aptos"/></a:majorFont>
      <a:minorFont><a:latin typeface="Aptos"/><a:ea typeface="Aptos"/><a:cs typeface="Aptos"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`

  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:subject>${escapeXml(subtitle)}</dc:subject>
  <dc:creator>Terrain 3D Viewer</dc:creator>
  <cp:lastModifiedBy>Terrain 3D Viewer</cp:lastModifiedBy>
</cp:coreProperties>`

  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Terrain 3D Viewer</Application>
</Properties>`

  return {
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(rootRels),
    'ppt/presentation.xml': strToU8(presentation),
    'ppt/_rels/presentation.xml.rels': strToU8(presentationRels),
    'ppt/slides/slide1.xml': strToU8(slideXml),
    'ppt/slides/_rels/slide1.xml.rels': strToU8(slideRels),
    'ppt/slideLayouts/slideLayout1.xml': strToU8(slideLayout),
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels': strToU8(slideLayoutRels),
    'ppt/slideMasters/slideMaster1.xml': strToU8(slideMaster),
    'ppt/slideMasters/_rels/slideMaster1.xml.rels': strToU8(slideMasterRels),
    'ppt/theme/theme1.xml': strToU8(theme),
    'docProps/core.xml': strToU8(core),
    'docProps/app.xml': strToU8(app),
    ...(hasImage ? { 'ppt/media/image1.png': imageBytes } : {}),
  }
}

export function createDocxBlob(report) {
  const files = buildDocxFiles(report)
  const zipped = zipSync(files, { level: 9 })
  return new Blob([zipped], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

export function createPptxBlob(report) {
  const files = buildPptxFiles(report)
  const zipped = zipSync(files, { level: 9 })
  return new Blob([zipped], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  })
}

export async function createPdfBlob(report) {
  const title = getReportTitle(report?.selectedRegion)
  const subtitle = getReportSubtitle(report?.selectedRegion)
  const rows = buildReportRows(report)
  const snapshotDataUri = await renderReportCanvas({
    title,
    subtitle,
    rows,
    snapshotDataUri: report?.snapshotDataUri,
  })
  const imageBytes = dataUriToU8(snapshotDataUri)
  const pdfBytes = buildPdfFromJpeg(imageBytes, 1600, 2260)
  return new Blob([pdfBytes], { type: 'application/pdf' })
}

export function createSvgBlob(report) {
  return new Blob([buildReportVectorSvg(report)], { type: 'image/svg+xml' })
}

export function buildOfficeHtml(report) {
  return buildOfficeReportHtml(report)
}

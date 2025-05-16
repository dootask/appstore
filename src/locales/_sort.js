import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 递归排序对象
function sortObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  }

  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key] = sortObject(obj[key]);
      return result;
    }, {});
}

// 处理翻译文件
function processTranslationFile(filePath) {
  try {
    // 读取文件内容
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    // 排序对象
    const sortedData = sortObject(data);

    // 写入文件，保持格式美观
    fs.writeFileSync(
      filePath,
      JSON.stringify(sortedData, null, 2) + '\n',
      'utf8'
    );

    console.log(`✅ 已处理: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ 处理 ${path.basename(filePath)} 时出错:`, error.message);
  }
}

// 主函数
function main() {
  // 读取所有翻译文件
  const files = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.json'));

  console.log('开始处理翻译文件...\n');

  // 处理每个文件
  files.forEach(file => {
    const filePath = path.join(__dirname, file);
    processTranslationFile(filePath);
  });

  console.log('\n所有文件处理完成！');
}

main();
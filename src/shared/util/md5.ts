import SparkMD5 from "spark-md5";

export function arrayMd5(data: string[]): string {
  const spark = new SparkMD5();
  data.forEach((v) => spark.append(v));
  return spark.end();
}

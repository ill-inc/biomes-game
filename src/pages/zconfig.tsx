import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: { md5: CONFIG.md5 },
  };
};

export default function Index({ md5 }: { md5: string }) {
  return <span>{md5}</span>;
}

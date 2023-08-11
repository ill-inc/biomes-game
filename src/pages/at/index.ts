import DispatchView, {
  getServerSideProps as slugProps,
} from "@/pages/at/[...slug]";

export const getServerSideProps = slugProps;
const View = DispatchView;

export default View;

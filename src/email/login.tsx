import { Button } from "@react-email/button";
import { Container } from "@react-email/container";
import { Html } from "@react-email/html";
import { Img } from "@react-email/img";
import { Text } from "@react-email/text";
import emailLogo from "/public/hud/email-logo.png";

export const LoginEmail: React.FunctionComponent<{
  link: string;
}> = ({ link }) => {
  const container: React.CSSProperties = {
    background: "#ffffff",
    margin: "0 auto",
    padding: "40px",
    marginBottom: "64px",
  };
  const button: React.CSSProperties = {
    backgroundColor: "#9277f0",
    color: "#ffffff",
    fontWeight: "600",
    borderRadius: "8px",
    textDecoration: "none",
    textAlign: "center",
    boxSizing: "border-box",
  };

  return (
    <Html>
      <Container style={container}>
        <Img src={emailLogo.src} width="32" height="32" />
        <Text>Here is your magic login link (expires in 15 minutes):</Text>
        <Text>
          <Button pX={20} pY={12} href={link} style={button}>
            Login to Biomes
          </Button>
        </Text>
        <Text>—The Biomes Team</Text>

        <Text>
          You&apos;re receiving this email because you requested to login to
          biomes.gg. Replies to this email address are not monitored.
        </Text>
      </Container>
    </Html>
  );
};

export default LoginEmail;

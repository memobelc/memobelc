import { StyleSheet } from "react-native";
import { colors } from "@/styles/colors";
export const styles = StyleSheet.create({

  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold"
  },
  text:{
    color: "white"
  },

  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 10,
},
backButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
},

  container: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 40,
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#F5E8F3',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#7A4F7F',
  },
  eyeIcon: {
    padding: 10,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  rememberMeText: {
    marginLeft: 10,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#4285F4',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    color: 'white',
  },
  footerLink: {
    color: colors.primary[600],
    fontWeight: 'bold',
  },
  forgotPasswordLink: {
    color: colors.primary[600],
    marginTop: 10,
    textAlign: 'right',
  },

  button: {
    backgroundColor: '#4285F4',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 20,
    textAlign: 'center',
    color: '#007bff',
  },
})
import {
  DataTypes,
  Model,
} from 'sequelize';
import sequelize from '../database/connection';
export class recolecta extends Model{

    public NIF!: string;
    public numero_pasapote!: string;
    public pais !: string;
    public nombre !: string;
    public apellido !: string;
    public direccion !: string; 
    public calle !: string;
    public codigo_postal !: string;
    public ciudad !: string;
    public provincia !: string;
    public comunidad_autonoma !: string;
    public importe !: number;
    public email !: string;
    public telefono !: string;  
}
    recolecta.init ({
        NIF: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        numero_pasapote: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        pais: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        nombre: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        apellido: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        direccion: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        calle: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        codigo_postal: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        ciudad: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        provincia: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        comunidad_autonoma: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        importe: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },  {
    sequelize,
    tableName: "recolecta_datos",
    timestamps: false,
  });

